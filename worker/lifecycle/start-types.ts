import type { User } from '../../src/shared/api'
import type { SendMessageRequest } from '../../src/shared/messages'
import type { MaskedStartLog } from './masked-start-log'
import type { ProvisionedWorkspace } from './workspace-response'
import type { RepositoryLocation } from './repository-locations'
import type { SavedScript } from './saved-script'
import type { ProviderRetryState } from './provider-retry'

interface WorkspaceStartData {
  workspaceId: string
  orgId: string
  imageName: string | null
  startupScript: SavedScript
  environmentCiphertext: string | null
  defaultBranch: string
  repositoryLocations?: readonly RepositoryLocation[]
  turnId: string
  attempt: string
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
  providerRetry?: ProviderRetryState | null
  deadlineAt?: number
}

export type WorkspaceMachinePhase =
  'machine' | 'ready' | 'fetch' | 'branch' | 'startup'

export type WorkspaceRunningStartJob = WorkspaceStartData &
  (
    | { kind: 'resume'; phase: WorkspaceMachinePhase; admission?: never }
    | {
        kind: 'create'
        phase: WorkspaceMachinePhase
        admission: ProvisionedWorkspace
      }
  )

export type WorkspaceStartJob =
  | WorkspaceRunningStartJob
  | (WorkspaceStartData & {
      kind: 'create'
      phase: 'records'
      admission?: never
    })

export interface WorkspaceCreation {
  user: User
  sender: User
  repositoryId: string
  sectionId?: string
  city: string
  branch: string
  sessionId: string
  request: SendMessageRequest
  createdAt: number
}

export type WorkspaceStartResult<Log = MaskedStartLog> =
  | { ok: true }
  | { ok: false; error: { code: string; message: string; log: Log | null } }

export type WorkspaceCreationAdmission =
  | { ok: true; created: ProvisionedWorkspace }
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
  begin(job: WorkspaceStartJob, epoch: number): Promise<boolean>
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
  schedule(): Promise<void>
}
