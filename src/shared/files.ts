import { workspacePath } from './workspaces'
import type { Attachment, UploadAttachmentResponse } from './messages'

function fileQuery(orgId: string, id: string, route: string, path: string) {
  return `${workspacePath(orgId, id)}/${route}?${new URLSearchParams({ path })}`
}

export const filePaths = {
  tree: (orgId: string, id: string) => `${workspacePath(orgId, id)}/files/tree`,
  content: (orgId: string, id: string, path: string) =>
    fileQuery(orgId, id, 'files/content', path),
  download: (orgId: string, id: string, path: string) =>
    fileQuery(orgId, id, 'files/download', path),
  changes: (orgId: string, id: string) => `${workspacePath(orgId, id)}/changes`,
  diff: (orgId: string, id: string, path: string) =>
    fileQuery(orgId, id, 'changes/diff', path),
  attachments: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/attachments`,
} as const

export type ChangeKind =
  'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
export interface FileEntry {
  path: string
  name: string
  kind: 'file' | 'directory'
  change: ChangeKind | null
}
export interface FileTreeResponse {
  revision: number
  /** A full, flat list. Each path is relative to the repository root. */
  entries: readonly FileEntry[]
}

export type FileTreeChange =
  | { operation: 'upsert'; entry: FileEntry }
  | { operation: 'remove'; path: string }
  | { operation: 'move'; previousPath: string; entry: FileEntry }

export interface FileTreeDelta {
  /** The next tree revision. Split large updates into consecutive revisions. */
  revision: number
  /**
   * At most FILE_TREE_DELTA_MAX_CHANGES, also within FILE_EVENT_MAX_BYTES.
   * An upsert of an unchanged entry reports a content change for that path.
   */
  changes: readonly FileTreeChange[]
}

/** Browser events contain complete reports. Runner parts use RunnerFileEvent. */
export type FileEvent =
  | { type: 'files.snapshot'; tree: FileTreeResponse }
  | { type: 'files.changed'; delta: FileTreeDelta }
  | { type: 'changes.updated'; changes: ChangesResponse }

/**
 * Maximum UTF-8 bytes of JSON.stringify(one complete RunnerFileEvent).
 * Count the discriminator, metadata, escapes, and delimiters, not an envelope.
 * A 256 KiB budget leaves room below the stored event limit for other fields.
 * A path or entry stays whole. Counts alone cannot bound arbitrary path bytes.
 */
export const FILE_EVENT_MAX_BYTES = 262_144

/** Bound the tree work of one delta, as well as its serialized byte size. */
export const FILE_TREE_DELTA_MAX_CHANGES = 512

/**
 * Revisions and part numbers are positive safe integers, scoped to a stream.
 * Tree reports and changes reports have independent revision sequences.
 * A new stream starts each sequence at 1 with a full report.
 * Reconnects keep the stream, revisions, and pending parts.
 * Parts run from 1 through partCount, in order, with one fixed partCount.
 * A single or empty report uses partNumber 1 and partCount 1.
 * Capture one consistent state. Do not interleave revisions of one report kind.
 * Apply a full report atomically only after every part has been stored.
 * Deduplicate by stream and runner event number before joining parts.
 * An identical repeated part never counts twice. A conflicting part is invalid.
 * Keep the last complete report while parts are pending or a part is refused.
 * Discard an incomplete report after a refusal or the start of a newer report.
 * Never join parts from different streams, report kinds, or revisions.
 * A new stream discards the old stream's incomplete reports.
 */
export interface RunnerFileRevisionPart {
  revision: number
  partNumber: number
  partCount: number
}

/** Concatenate entries in part order. Each path occurs once in the full tree. */
export type RunnerFileTreePart = FileTreeResponse & RunnerFileRevisionPart

/**
 * Concatenate files in part order. Each path occurs once in the full list.
 * Every part repeats the same baseBranch and summary for the complete report.
 * summary.files counts the complete list, not the files in this part.
 */
export type RunnerChangesPart = ChangesResponse & RunnerFileRevisionPart

/**
 * Each payload obeys FILE_EVENT_MAX_BYTES. Its complete runner envelope also
 * obeys RUNNER_EVENT_MAX_BYTES.
 * Tree deltas follow the last applied tree revision, increasing by exactly 1.
 * A split update uses several bounded deltas with consecutive revisions.
 * Changes report revisions increase by 1 for each new full changes report.
 * A full report has a newer revision than the last applied report of its kind.
 * A full report can skip unapplied revisions to recover missing or refused data.
 * Missing parts and revision gaps must never produce a partial full report.
 * Browser file responses and FileEvent retain their complete-report meaning.
 */
export type RunnerFileEvent =
  | { type: 'files.snapshot'; tree: RunnerFileTreePart }
  | { type: 'files.changed'; delta: FileTreeDelta }
  | { type: 'changes.updated'; changes: RunnerChangesPart }

export interface ReadFileRequest {
  path: string
}
export interface ReadDiffRequest {
  path: string
}
export interface FileResponse {
  path: string
  mediaType: string
  sizeBytes: number
  encoding: 'utf-8' | 'base64'
  content: string
}
export interface FileTooLargeResponse {
  error: {
    code: 'file_too_large'
    message: string
    sizeBytes: number
    limitBytes: number
  }
}
export interface ChangedFile {
  path: string
  previousPath?: string
  change: ChangeKind
  added: number
  removed: number
}
export interface BranchChangedFile extends ChangedFile {
  /** Includes changes in the index and working tree, also untracked files. */
  uncommitted: boolean
}
export interface ChangesResponse {
  baseBranch: string
  files: readonly BranchChangedFile[]
  summary: { files: number; added: number; removed: number }
}
export interface DiffResponse {
  path: string
  baseBranch: string
  oldContent: string | null
  newContent: string | null
  patch: string
  binary: boolean
}

export interface AttachmentsResponse {
  attachments: readonly Attachment[]
}
export type AttachFileResponse = UploadAttachmentResponse
