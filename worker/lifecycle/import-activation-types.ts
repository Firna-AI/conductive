import type { ImportSnapshot } from '../../src/shared/conductor-import-manifest'
import type {
  RunnerImportAction,
  RunnerImportResult,
} from '../../src/shared/runner-import'
import type { ImageSoftwareArtifact } from './image-software'

export type ImportStartPhase =
  | 'import-software'
  | 'import-launch'
  | 'import-open'
  | 'import-manifest'
  | 'import-preflight'
  | 'import-parts'
  | 'import-restore'
  | 'import-sessions'
  | 'import-finish'
  | 'import-publish'
export type ImportPendingAction =
  | Exclude<RunnerImportAction, { kind: 'chunk' | 'manifest' }>
  | Omit<Extract<RunnerImportAction, { kind: 'chunk' }>, 'base64'>
  | { kind: 'manifest'; offset: number; count: number; sha256: string }

export interface ImportActivationProgress {
  sessionId: string
  activatorUserId: string
  importerUserId: string
  software: ImageSoftwareArtifact
  snapshot: ImportSnapshot
  epoch: number
  cursor: number
  partOffset: number
  sequence: number
  cleanupPending?: boolean
  finished?: boolean
  resumePhase?: import('./start-types').WorkspaceMachinePhase
  launchAttempt?: string
  pending?: {
    commandId: string
    action: ImportPendingAction
    connectionId?: string
    result?: RunnerImportResult
  }
}
