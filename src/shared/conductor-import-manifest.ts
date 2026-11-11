import type { ImportPart } from './conductor-import-storage.ts'

export interface ImportSnapshot {
  version: 1
  sourceFingerprint: string
  localWorkspaceId: string
  repository: string
  branch: string
  headOid: string
  objectFormat: 'sha1' | 'sha256'
  bundleObjectId: string | null
  recordCount: number
  objectCount: number
  partCount: number
  sessionCount: number
  storedBytes: number
  restoredBytes: number
  gitDisk: ImportGitDiskFacts
}

/** Logical Git facts from the same private staging state as the snapshot. */
export interface ImportGitDiskFacts {
  version: 1
  treeOid: string
  reconstruction: {
    objectCount: number
    inflatedBytes: number
    maxObjectBytes: number
  }
  checkout: {
    fileCount: number
    fileBytes: number
    directoryCount: number
    symlinkCount: number
    symlinkBytes: number
    pathBytes: number
  }
  /** Payload totals are additional to raw LFS pointer blobs in checkout. */
  lfs: {
    cacheObjectCount: number
    cacheBytes: number
    checkoutPathCount: number
    checkoutBytes: number
  }
}

/** @public The Mac packer declares content objects with this portable type. */
export interface ImportContentObject {
  kind: 'object'
  id: string
  purpose: 'bundle' | 'file' | 'memory' | 'document'
  encoding: 'identity' | 'zstd'
  sizeBytes: number
  restoredBytes: number
  partCount: number
}

/** @public The packer and activation receiver share object-relative part order. */
export interface ImportObjectPart {
  kind: 'part'
  objectId: string
  index: number
  part: ImportPart
}

/** @public Private recipes are consumed by the packer and activation receiver. */
export interface ImportNativeSession {
  kind: 'session'
  id: string
  title: string | null
  agent: 'claude' | 'codex'
  model: string | null
  messageCount: number
  occurredAt: number | null
  nativeId: string
  nativePath: string
  memoryObjectId: string
  documentObjectId: string
}

/** @public The packer and restore receiver use the same filesystem records. */
export type ImportFileEntry =
  | { kind: 'file'; path: string; mode: '100644' | '100755'; objectId: string }
  | { kind: 'directory'; path: string; mode: number }
  | { kind: 'symlink'; path: string; target: string }
  | { kind: 'delete'; path: string }

/** @public Bundle builders retain the server receipt for each prerequisite. */
export interface ImportPrerequisite {
  kind: 'prerequisite'
  oid: string
  receiptId: string
}

export type ImportManifestEntry =
  | ImportContentObject
  | ImportObjectPart
  | ImportNativeSession
  | ImportFileEntry
  | ImportPrerequisite

export interface ImportManifestPage {
  offset: number
  entries: ImportManifestEntry[]
  nextCursor: number | null
}

/** @public The activation receiver uses this safe old-document destination. */
export const importDocumentFile = (id: string) =>
  `.context/conductor/${encodeURIComponent(id)}.md`
