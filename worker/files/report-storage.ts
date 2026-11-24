import type { RunnerChangesPart } from '../../src/shared/generated/RunnerChangesPart'
import type { RunnerFileEvent } from '../../src/shared/generated/RunnerFileEvent'
import { isRecord } from '../http'
import { natural } from './parsers'
import { parseRunnerFileEvent } from './runner-input'
import type { FilesReader } from './storage'

export type ReportKind = 'tree' | 'changes'
export interface ChangesPartFields {
  baseBranch: string
  unpushedCommits?: number
  uncommittedFileCount?: number
  summary: RunnerChangesPart['summary']
}
export interface ReportProgress {
  revision: number
  partCount: number
  through: number
  fields?: ChangesPartFields
}
export interface ReportSequence {
  appliedRevision: number
  seen: boolean
  report: ReportProgress | null
}
export interface ReportState {
  streamId: string
  tree: ReportSequence
  changes: ReportSequence
}

export const REPORT_KEY = 'files:runner:v1'
export const partKey = (kind: ReportKind, part: number) =>
  `${REPORT_KEY}:${kind}:${part}`
const CHUNK_CHARACTERS = 65_536
const partChunkKeys = (key: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${key}:chunk:${index}`)
export const emptySequence = (): ReportSequence => ({
  appliedRevision: 0,
  seen: false,
  report: null,
})

export function changesPartFields({
  baseBranch,
  unpushedCommits,
  uncommittedFileCount,
  summary,
}: ChangesPartFields): ChangesPartFields {
  return {
    baseBranch,
    ...(unpushedCommits === undefined ? {} : { unpushedCommits }),
    ...(uncommittedFileCount === undefined ? {} : { uncommittedFileCount }),
    summary: {
      files: summary.files,
      added: summary.added,
      removed: summary.removed,
    },
  }
}

function parseChangesPartFields(value: unknown): ChangesPartFields | undefined {
  if (!isRecord(value)) return undefined
  const { baseBranch, unpushedCommits, uncommittedFileCount, summary } = value
  if (
    typeof baseBranch !== 'string' ||
    (unpushedCommits !== undefined && !natural(unpushedCommits)) ||
    (uncommittedFileCount !== undefined && !natural(uncommittedFileCount)) ||
    !isRecord(summary) ||
    !natural(summary.files) ||
    !natural(summary.added) ||
    !natural(summary.removed)
  )
    return undefined
  return changesPartFields({
    baseBranch,
    unpushedCommits,
    uncommittedFileCount,
    summary: {
      files: summary.files,
      added: summary.added,
      removed: summary.removed,
    },
  })
}

function sequence(value: unknown, kind: ReportKind): ReportSequence {
  if (
    !isRecord(value) ||
    !natural(value.appliedRevision) ||
    typeof value.seen !== 'boolean'
  )
    throw new Error('Stored runner report state is invalid.')
  const report = value.report
  let progress: ReportProgress | null = null
  if (report !== null) {
    if (
      !isRecord(report) ||
      !natural(report.revision) ||
      !natural(report.partCount) ||
      !natural(report.through) ||
      report.revision === 0 ||
      report.partCount === 0 ||
      report.through === 0 ||
      report.through > report.partCount
    )
      throw new Error('Stored runner report progress is invalid.')
    const fields =
      kind === 'changes' ? parseChangesPartFields(report.fields) : undefined
    progress = {
      revision: report.revision,
      partCount: report.partCount,
      through: report.through,
      ...(fields ? { fields } : {}),
    }
  }
  return {
    appliedRevision: value.appliedRevision,
    seen: value.seen,
    report: progress,
  }
}

export async function loadReportState(
  storage: FilesReader,
): Promise<ReportState | null> {
  const value = await storage.get(REPORT_KEY)
  if (value === undefined) return null
  if (!isRecord(value) || typeof value.streamId !== 'string')
    throw new Error('Stored runner stream is invalid.')
  return {
    streamId: value.streamId,
    tree: sequence(value.tree, 'tree'),
    changes: sequence(value.changes, 'changes'),
  }
}

function reportKeys(kind: ReportKind, report: ReportProgress | null): string[] {
  return Array.from({ length: report?.through ?? 0 }, (_, index) =>
    partKey(kind, index + 1),
  )
}

function partChunks(value: unknown): number {
  if (!isRecord(value) || !('reportPartChunks' in value)) return 0
  if (!natural(value.reportPartChunks) || value.reportPartChunks === 0)
    throw new Error('Stored runner report part is invalid.')
  return value.reportPartChunks
}

/** Include every chunk when a report is replaced, refused, or changes streams. */
export async function storedReportKeys(
  storage: FilesReader,
  kind: ReportKind,
  report: ReportProgress | null,
): Promise<string[]> {
  const keys = reportKeys(kind, report)
  const values = await storage.getMany(keys)
  return keys.flatMap((key) => [
    key,
    ...partChunkKeys(key, partChunks(values.get(key))),
  ])
}

/** Sanitized display labels can grow beyond the limit of one stored value. */
export function reportPartUpdates(
  kind: ReportKind,
  partNumber: number,
  event: RunnerFileEvent,
): Readonly<Record<string, unknown>> {
  const key = partKey(kind, partNumber)
  const text = JSON.stringify(event)
  const count = Math.ceil(text.length / CHUNK_CHARACTERS)
  const updates: Record<string, unknown> = {
    [key]: { reportPartChunks: count },
  }
  for (const [index, chunkKey] of partChunkKeys(key, count).entries())
    updates[chunkKey] = text.slice(
      index * CHUNK_CHARACTERS,
      (index + 1) * CHUNK_CHARACTERS,
    )
  return updates
}

async function readPart(
  storage: FilesReader,
  key: string,
  value: unknown,
): Promise<RunnerFileEvent> {
  const count = partChunks(value)
  if (!count) return parseRunnerFileEvent(value)
  const keys = partChunkKeys(key, count)
  const values = await storage.getMany(keys)
  const chunks = keys.map((chunkKey) => {
    const chunk = values.get(chunkKey)
    if (typeof chunk !== 'string')
      throw new Error('Stored runner report part is incomplete.')
    return chunk
  })
  const event: unknown = JSON.parse(chunks.join(''))
  return parseRunnerFileEvent(event)
}

export async function storedPart(
  storage: FilesReader,
  kind: ReportKind,
  partNumber: number,
): Promise<RunnerFileEvent> {
  const key = partKey(kind, partNumber)
  return readPart(storage, key, await storage.get(key))
}

export async function storedParts(
  storage: FilesReader,
  kind: ReportKind,
  report: ReportProgress,
  firstPart?: RunnerFileEvent,
): Promise<RunnerFileEvent[]> {
  const keys = reportKeys(kind, report)
  if (firstPart) keys.shift()
  const values = await storage.getMany(keys)
  const parts = await Promise.all(
    keys.map((key) => readPart(storage, key, values.get(key))),
  )
  if (firstPart) parts.unshift(firstPart)
  return parts
}
