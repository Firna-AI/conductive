import type {
  ImportManifestEntry,
  ImportSnapshot,
  ImportPrerequisite,
} from '../../../src/shared/conductor-import-manifest.ts'
import type {
  ImportRepositoryFacts,
  ImportScanRow,
  ImportDeviceFrame,
  ImportPrivateAck,
} from '../../../src/shared/conductor-import-operation.ts'
import type { ImportPart } from '../../../src/shared/conductor-import-storage.ts'
import type { ImportLfsObject } from '../../../src/shared/conductor-import-lfs.ts'

export interface ImportLocations {
  home: string
  userData: string
  xdgConfigHome?: string
}

export type ImportFrameSend = (
  message: ImportDeviceFrame | ImportPrivateAck,
  signal: AbortSignal,
) => Promise<boolean>

export interface SourceSession {
  id: string
  title: string | null
  agent: 'claude' | 'codex' | null
  model: string | null
  nativeId: string | null
}

export interface SourceWorkspace {
  row: ImportScanRow
  path: string | null
  sessions: SourceSession[]
}

export interface SourceFile {
  path: string
  kind: 'file' | 'directory' | 'symlink' | 'delete'
  mode: number
  size: number
  identity: string
  hash?: string
  target?: string
  lfs?: {
    blobOid: string
    payloadOid: string
    size: number
    mode: '100644' | '100755'
  }
}

export interface SourceInventory {
  workspace: SourceWorkspace
  headOid: string
  branch: string
  objectFormat: 'sha1' | 'sha256'
  commonDirectory: string
  prerequisiteCandidates: string[]
  files: SourceFile[]
  native: {
    session: SourceSession
    path: string | null
    identity: string | null
    hash: string | null
  }[]
  digest: string
}

export interface ImportStage {
  id: string
  sourceDigest: string
  row: ImportScanRow
  headOid: string
  candidates: string[]
  snapshot: ImportSnapshot
}

export type ImportJob =
  | { action: 'exists' }
  | { action: 'scan' }
  | { action: 'row'; localWorkspaceId: string }
  | {
      action: 'prepare'
      localWorkspaceId: string
      scope: string
      reservationId: string
    }
  | {
      action: 'reuse'
      localWorkspaceId: string
      scope: string
      reservationId: string
    }
  | {
      action: 'build'
      stageId: string
      facts: ImportRepositoryFacts
      exclusions?: string[]
    }
  | { action: 'seal'; stageId: string; prerequisites: ImportPrerequisite[] }
  | { action: 'page'; stageId: string; offset: number }
  | { action: 'part'; stageId: string; part: ImportPart }
  | { action: 'results'; stageId: string }
  | { action: 'lfs.page'; stageId: string; offset: number }
  | {
      action: 'lfs.available'
      stageId: string
      factsId: string
      page: number
      available: ImportLfsObject[]
    }

export interface ImportJobResults {
  exists: boolean
  scan: ImportScanRow[]
  row: ImportScanRow | null
  prepare: { id: string; row: ImportScanRow }
  reuse: ImportStage | null
  build: ImportStage
  seal: ImportStage
  page: ImportManifestEntry[]
  part: Uint8Array<ArrayBuffer>
  results: {
    files: { path: string; sizeBytes: number }[]
    sessions: { title: string | null }[]
  }
  'lfs.page': { objects: ImportLfsObject[]; nextCursor: number | null }
  'lfs.available': true
}

export type ImportJobs = <A extends ImportJob['action']>(
  job: Extract<ImportJob, { action: A }>,
  signal: AbortSignal,
) => Promise<ImportJobResults[A]>

export class LocalImportError extends Error {
  readonly code:
    'source_missing' | 'source_changed' | 'read_failed' | 'upload_failed'
  constructor(code: LocalImportError['code']) {
    super(code)
    this.code = code
  }
}
