import type { BranchChangedFile } from '../../shared/generated/BranchChangedFile'
import type { BrowserChangesResponse } from '../../shared/generated/BrowserChangesResponse'
import type { ChangeKind } from '../../shared/generated/ChangeKind'
import type { ChangesDelta } from '../../shared/generated/ChangesDelta'
import type { ChangesDeltaUpsert } from '../../shared/generated/ChangesDeltaUpsert'
import type { ChangesResponseSummary } from '../../shared/generated/ChangesResponseSummary'
import type { DiffResponse } from '../../shared/generated/DiffResponse'
import type { FileResponse } from '../../shared/generated/FileResponse'
import { FILE_CHANGES_DELTA_MAX_CHANGES } from '../../shared/files'
import {
  isObject,
  parseItems,
  readArray,
  readCount,
  readLabel,
  readSafeCount,
  readString,
  type JsonObject,
} from './guards'

const changeKinds: readonly ChangeKind[] = [
  'added',
  'modified',
  'deleted',
  'renamed',
  'untracked',
]

export function parseChangeKind(value: unknown): ChangeKind | null {
  return changeKinds.find((kind) => kind === value) ?? null
}

function parseChangedFile(
  value: unknown,
  count = readCount,
): BranchChangedFile | null {
  if (!isObject(value)) return null
  const path = readString(value, 'path')
  const change = parseChangeKind(value.change)
  const added = count(value, 'added')
  const removed = count(value, 'removed')
  if (!path || !change || added === null || removed === null) return null
  const previousPath = readString(value, 'previousPath')
  return {
    path,
    ...readLabel(value, 'displayPath'),
    ...(previousPath
      ? { previousPath, ...readLabel(value, 'previousDisplayPath') }
      : {}),
    change,
    added,
    removed,
    uncommitted: value.uncommitted === true,
  }
}

function parseSummary(
  value: unknown,
  count: typeof readCount,
): ChangesResponseSummary | null {
  if (!isObject(value)) return null
  const files = count(value, 'files')
  const added = count(value, 'added')
  const removed = count(value, 'removed')
  return files === null || added === null || removed === null
    ? null
    : { files, added, removed }
}

function parseHeader(value: JsonObject, count: typeof readCount) {
  const baseBranch = readString(value, 'baseBranch')
  const summary = parseSummary(value.summary, count)
  if (baseBranch === null || summary === null) return null
  const unpushedCommits = count(value, 'unpushedCommits')
  if (value.unpushedCommits !== undefined && unpushedCommits === null)
    return null
  const uncommittedFileCount = count(value, 'uncommittedFileCount')
  if (value.uncommittedFileCount !== undefined && uncommittedFileCount === null)
    return null
  return {
    baseBranch,
    ...(unpushedCommits === null ? {} : { unpushedCommits }),
    ...(uncommittedFileCount === null ? {} : { uncommittedFileCount }),
    ...readLabel(value, 'displayBaseBranch'),
    summary,
  }
}

/** A full changes list, with its revision and omitted totals when known. */
export function parseChanges(value: unknown): BrowserChangesResponse | null {
  if (!isObject(value)) return null
  const header = parseHeader(value, readCount)
  const files = readArray(value, 'files')
  if (!header || !files) return null
  const revision = readSafeCount(value, 'revision')
  const omitted = parseSummary(value.omitted, readSafeCount)
  return {
    ...header,
    ...(revision ? { revision } : {}),
    files: parseItems(files, parseChangedFile),
    ...(omitted ? { omitted } : {}),
  }
}

function parseUpsert(value: unknown): ChangesDeltaUpsert | null {
  if (!isObject(value)) return null
  const index = readSafeCount(value, 'index')
  const row = value.file
  if (index === null || !isObject(row) || typeof row.uncommitted !== 'boolean')
    return null
  const file = parseChangedFile(row, readSafeCount)
  return file ? { index, file } : null
}

export function parseChangesDelta(value: unknown): ChangesDelta | null {
  if (!isObject(value)) return null
  const revision = readSafeCount(value, 'revision')
  const header = parseHeader(value, readSafeCount)
  const omitted = parseSummary(value.omitted, readSafeCount)
  const removes = readArray(value, 'removes')
  const upserts = readArray(value, 'upserts')
  if (!revision || !header || !omitted || !removes || !upserts) return null
  if (removes.length + upserts.length > FILE_CHANGES_DELTA_MAX_CHANGES)
    return null
  const paths = parseItems(removes, (path) =>
    typeof path === 'string' && path ? path : null,
  )
  const rows = parseItems(upserts, parseUpsert)
  if (paths.length !== removes.length || rows.length !== upserts.length)
    return null
  return { ...header, revision, omitted, removes: paths, upserts: rows }
}

export function parseFileResponse(value: unknown): FileResponse | null {
  if (!isObject(value)) return null
  const path = readString(value, 'path')
  const mediaType = readString(value, 'mediaType')
  const sizeBytes = readCount(value, 'sizeBytes')
  const content = readString(value, 'content')
  const encoding = value.encoding
  if (!path || mediaType === null || sizeBytes === null || content === null) {
    return null
  }
  if (encoding !== 'utf-8' && encoding !== 'base64') return null
  return {
    path,
    ...readLabel(value, 'displayPath'),
    mediaType,
    sizeBytes,
    encoding,
    content,
  }
}

function readText(value: unknown): string | null | undefined {
  if (value === null || typeof value === 'string') return value
  return undefined
}

export function parseDiffResponse(value: unknown): DiffResponse | null {
  if (!isObject(value)) return null
  const path = readString(value, 'path')
  const baseBranch = readString(value, 'baseBranch')
  const patch = readString(value, 'patch')
  const oldContent = readText(value.oldContent)
  const newContent = readText(value.newContent)
  if (!path || baseBranch === null || patch === null) return null
  if (oldContent === undefined || newContent === undefined) return null
  if (typeof value.binary !== 'boolean') return null
  return {
    path,
    ...readLabel(value, 'displayPath'),
    baseBranch,
    ...readLabel(value, 'displayBaseBranch'),
    oldContent,
    newContent,
    patch,
    binary: value.binary,
  }
}
