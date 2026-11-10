import type {
  ImportManifestEntry,
  ImportSnapshot,
} from './conductor-import-manifest.ts'
import type { ImportPart } from './conductor-import-storage.ts'

export const RUNNER_IMPORT_BYTES = 1_048_576

export type RunnerImportAction =
  | {
      kind: 'open'
      snapshot: ImportSnapshot
      workspaceId: string
      defaultBranch: string
      deadlineAt: number
    }
  | { kind: 'manifest'; offset: number; entries: ImportManifestEntry[] }
  | { kind: 'preflight' }
  | {
      kind: 'chunk'
      part: ImportPart
      offset: number
      length: number
      sha256: string
      base64: string
    }
  | { kind: 'restore' }
  | { kind: 'session'; documentId: string }
  | { kind: 'finish' }

export interface RunnerImportCommand {
  type: 'import.command'
  commandId: string
  activationId: string
  epoch: number
  connectionId: string
  action: RunnerImportAction
}

interface RunnerImportFailure {
  code: string
  message: string
  requiredBytes?: string
  availableBytes?: string
}

export type RunnerImportResult =
  | {
      ok: true
      preparation?: 'prepared' | 'fallback'
      requiredBytes?: string
      availableBytes?: string
    }
  | { ok: false; error: RunnerImportFailure }

export interface RunnerImportReply {
  type: 'import.result'
  commandId: string
  activationId: string
  epoch: number
  connectionId: string
  result: RunnerImportResult
}

export interface RunnerImportPreparation {
  type: 'import.preparation'
  sessionId: string
  turnId: string
  documentId: string
  preparation: 'fallback'
}

/** Real session records use this stable workspace-local identity. */
export const importSessionId = (documentId: string) => `conductor:${documentId}`

export function runnerImportWire(value: unknown): string {
  const wire = JSON.stringify(value)
  if (new TextEncoder().encode(wire).byteLength >= RUNNER_IMPORT_BYTES)
    throw new Error('The import frame exceeds its byte budget.')
  return wire
}
