import type { DevicePairing } from './device.ts'
import type {
  ImportManifestEntry,
  ImportSnapshot,
} from './conductor-import-manifest.ts'
import type {
  ImportPart,
  ImportUploadTarget,
} from './conductor-import-storage.ts'

export interface ImportScanRow {
  localWorkspaceId: string
  name: string
  repository: string | null
  branch: string | null
  sessionCount: number | null
  uploadBytes: number | null
}

export type ImportRowState =
  | { state: 'available' }
  | { state: 'unavailable' }
  | { state: 'imported'; workspaceId: string }
  | {
      state: 'unfinished'
      reservationId: string | null
      storedBytes: number
      expiresAt: number
    }

export interface ImportReservation {
  id: string
  localWorkspaceId: string
  sourceFingerprint: string | null
  createdAt: number
  expiresAt: number
  storedBytes: number
  workspaceId: string | null
}

export type ImportPublicReservation = Omit<
  ImportReservation,
  'sourceFingerprint'
>

export type ImportAction =
  | { action: 'status' | 'dismiss' | 'scan' }
  | { action: 'upload'; localWorkspaceId: string }
  | { action: 'retry'; localWorkspaceId: string; reservationId: string }

/** @public The desktop renderer sends this request through the Worker. */
export type ImportOperationRequest = DevicePairing & ImportAction

export interface ImportRepositoryFacts {
  id: string
  repositoryId: number
  fullName: string
  branch: string
  branchHeadOid: string | null
  defaultBranch: string
  defaultHeadOid: string | null
  observedAt: number
}

export type ImportDeviceEvent =
  | {
      kind: 'status'
      available: boolean
      dismissed: boolean
      consent: 'unknown' | 'allowed' | 'denied'
    }
  | { kind: 'scan'; rows: ImportScanRow[] }
  | {
      kind: 'reserve'
      row: ImportScanRow
      replace?: { reservationId: string; sourceFingerprint: string | null }
    }
  | { kind: 'snapshot'; reservationId: string; snapshot: ImportSnapshot }
  | {
      kind: 'manifest'
      reservationId: string
      offset: number
      entries: ImportManifestEntry[]
    }
  | { kind: 'manifest.end'; reservationId: string }
  | { kind: 'missing'; reservationId: string; cursor: number }
  | { kind: 'target' | 'verify'; reservationId: string; partId: string }
  | { kind: 'complete'; reservationId: string }
  | { kind: 'repository.facts'; reservationId: string }
  | {
      kind: 'repository.prerequisites'
      reservationId: string
      factsId: string
      sourceFingerprint: string
      headOid: string
      candidates: string[]
    }
  | { kind: 'progress'; reservationId: string; inFlightBytes: number }
  | {
      kind: 'result.files'
      localWorkspaceId: string
      files: { path: string; sizeBytes: number }[]
    }
  | {
      kind: 'result.sessions'
      localWorkspaceId: string
      sessions: { title: string | null }[]
    }
  | { kind: 'done' }
  | {
      kind: 'failed'
      code:
        | 'consent_required'
        | 'source_missing'
        | 'source_changed'
        | 'read_failed'
        | 'upload_failed'
    }

export type ImportControlResult =
  | { kind: 'accepted' }
  | { kind: 'reservation'; reservation: ImportReservation }
  | { kind: 'missing'; parts: ImportPart[]; nextCursor: number | null }
  | { kind: 'target'; target: ImportUploadTarget }
  | { kind: 'verified'; verified: boolean; storedBytes: number }
  | { kind: 'complete'; workspaceId: string }
  | { kind: 'repository.facts'; facts: ImportRepositoryFacts }
  | {
      kind: 'repository.prerequisites'
      receiptId: string
      verified: { oid: string; headOid: string }[]
      missing: string[]
    }

export type ImportPublicEvent =
  | Extract<
      ImportDeviceEvent,
      {
        kind: 'status' | 'result.files' | 'result.sessions' | 'done' | 'failed'
      }
    >
  | { kind: 'scan'; rows: (ImportScanRow & ImportRowState)[] }
  | {
      kind: 'progress'
      reservation: ImportPublicReservation
      inFlightBytes: number
    }
  | { kind: 'complete'; localWorkspaceId: string; workspaceId: string }
  | { kind: 'error'; code: string; message: string }

export interface ImportDeviceFrame {
  type: 'import.frame'
  operationId: string
  sequence: number
  event: ImportDeviceEvent
}

export interface ImportPrivateAck {
  type: 'import.part.ack'
  operationId: string
  sequence: number
  page: number
}

export type ImportWorkerFrame =
  | {
      type: 'import.part'
      operationId: string
      sequence: number
      page: number
      result: Extract<ImportControlResult, { kind: 'repository.prerequisites' }>
    }
  | {
      type: 'import.operation'
      operationId: string
      orgId: string
      operation: ImportAction
    }
  | {
      type: 'import.ack'
      operationId: string
      sequence: number
      result: ImportControlResult
    }
  | {
      type: 'import.error'
      operationId: string
      sequence: number
      code: string
      message: string
    }
  | { type: 'import.cancel'; operationId: string }
