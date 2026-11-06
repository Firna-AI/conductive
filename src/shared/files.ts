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
  revision: number
  changes: readonly FileTreeChange[]
}

export type FileEvent =
  | { type: 'files.snapshot'; tree: FileTreeResponse }
  | { type: 'files.changed'; delta: FileTreeDelta }
  | { type: 'changes.updated'; changes: ChangesResponse }

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
