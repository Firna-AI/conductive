import type { User } from '../../src/shared/api'
import type { SendMessageRequest } from '../../src/shared/messages'
import type { MaskedStartLog } from './masked-start-log'
import type { SavedProvisionedWorkspace } from './workspace-response'
import type { RepositoryLocation } from './repository-locations'
import type { SavedScript } from './saved-script'
import type { ProviderRetryState } from './provider-retry'
import type { FirstWorkspaceMessage } from './workspace-runtime'

interface WorkspaceStartData {
  workspaceId: string
  orgId: string
  providerAccount: string
  imageName: string | null
  startupScript: SavedScript
  environmentCiphertext: string | null
  defaultBranch: string
  baseBranch?: string
  startSha?: string
  repositoryLocations?: readonly RepositoryLocation[]
  turnId: string
  attempt: string
  /** Restore changes only the command journal identity, not allocation. */
  commandAttempt?: string
  /** A retained create rebuilds runtime files from this phase after readiness. */
  afterReadyPhase?: 'fetch' | 'branch' | 'startup'
  creation?: WorkspaceCreation
  processId: number | null
  stdoutOffset: number
  stderrOffset: number
  createPayloadCiphertext?: string
  allocatedSandboxId?: string
  cancelled?: boolean
  failure?: {
    code: string
    message: string
    status: number
    timeLimit?: boolean
  }
  requestedByUserId?: string
  providerRetry?: ProviderRetryState | null
  deadlineAt?: number
}

/** Admission intent is transient. Saved starts always continue their progress. */
export type WorkspaceStartIntent =
  | { kind: 'continue' }
  | { kind: 'retry-failed-create' }
  | { kind: 'resume-retained-create' }

export type WorkspaceMachinePhase =
  | 'machine'
  | 'ready'
  | 'fetch'
  | 'branch'
  | 'startup'
  | 'terminal'
  | 'terminal-password'
  | 'runner'

export type WorkspaceRunningStartJob = WorkspaceStartData &
  (
    | { kind: 'resume'; phase: WorkspaceMachinePhase; admission?: never }
    | {
        kind: 'create'
        phase: WorkspaceMachinePhase
        admission: SavedProvisionedWorkspace
      }
  )

export type WorkspaceStartJob =
  | WorkspaceRunningStartJob
  | (WorkspaceStartData & {
      kind: 'create'
      phase: 'records'
      admission?: never
    })

interface WorkspaceCreation {
  user: User
  sender: User
  repositoryId: string
  sectionId?: string
  city: string
  name?: string
  branch: string
  sessionId: string
  request: SendMessageRequest
  createdAt: number
}

export type WorkspaceStartResult<Log = MaskedStartLog> =
  | { ok: true }
  | { ok: false; error: { code: string; message: string; log: Log | null } }

export type WorkspaceCreationAdmission =
  | { ok: true; created: SavedProvisionedWorkspace }
  | Extract<WorkspaceStartResult<null>, { ok: false }>

export interface CompletedWorkspaceCreation {
  result: WorkspaceStartResult<null>
  admission: WorkspaceCreationAdmission
}

export interface CreationPublication {
  workspaceId: string
  state: 'succeeded' | 'failed'
}

export interface StartJobStorage {
  job(): Promise<WorkspaceStartJob | undefined>
  epoch(): Promise<number>
  begin(
    job: WorkspaceStartJob,
    epoch: number,
    intent?: WorkspaceStartIntent,
  ): Promise<boolean>
  stop(): Promise<boolean>
  update(job: WorkspaceStartJob): Promise<void>
  retry(
    attempt: string,
    state: ProviderRetryState | null | 'progress',
  ): Promise<boolean>
  deferAllocationCleanup(job: WorkspaceStartJob): Promise<void>
  result(): Promise<WorkspaceStartResult | undefined>
  creationResult(): Promise<WorkspaceStartResult | undefined>
  admission(): Promise<WorkspaceCreationAdmission | undefined>
  firstMessage(): Promise<FirstWorkspaceMessage | undefined>
  publication(): Promise<CreationPublication | undefined>
  clearPublication(): Promise<void>
  complete(result: WorkspaceStartResult): Promise<void>
  secrets(values: readonly string[]): Promise<void>
  capture(
    job: WorkspaceStartJob,
    output: {
      stdout: string
      stderr: string
      stdoutNextOffset: number
      stderrNextOffset: number
    },
  ): Promise<void>
  schedule(at?: number): Promise<void>
  schedulePublication(at?: number): Promise<void>
}
