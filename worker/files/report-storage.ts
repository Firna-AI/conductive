import type { RunnerFileEvent } from '../../src/shared/files'
import { isRecord } from '../http'
import { natural } from './parsers'
import { parseRunnerFileEvent } from './runner-input'
import type { FilesStorage } from './storage'

export type ReportKind = 'tree' | 'changes'
export interface ReportProgress {
  revision: number
  partCount: number
  through: number
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
export const emptySequence = (): ReportSequence => ({
  appliedRevision: 0,
  seen: false,
  report: null,
})

function sequence(value: unknown): ReportSequence {
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
    progress = {
      revision: report.revision,
      partCount: report.partCount,
      through: report.through,
    }
  }
  return {
    appliedRevision: value.appliedRevision,
    seen: value.seen,
    report: progress,
  }
}

export async function loadReportState(
  storage: FilesStorage,
): Promise<ReportState | null> {
  const value = await storage.get(REPORT_KEY)
  if (value === undefined) return null
  if (!isRecord(value) || typeof value.streamId !== 'string')
    throw new Error('Stored runner stream is invalid.')
  return {
    streamId: value.streamId,
    tree: sequence(value.tree),
    changes: sequence(value.changes),
  }
}

export function reportKeys(
  kind: ReportKind,
  report: ReportProgress | null,
): string[] {
  return Array.from({ length: report?.through ?? 0 }, (_, index) =>
    partKey(kind, index + 1),
  )
}

export async function storedParts(
  storage: FilesStorage,
  kind: ReportKind,
  report: ReportProgress,
): Promise<RunnerFileEvent[]> {
  const keys = reportKeys(kind, report)
  const values = await storage.getMany(keys)
  return keys.map((key) => parseRunnerFileEvent(values.get(key)))
}
