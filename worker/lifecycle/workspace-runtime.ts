import type { User } from '../../src/shared/api'
import type { SendMessageRequest } from '../../src/shared/messages'
import type { StartStep, WorkspaceStart } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import type { DurableLifecycleState } from './durable-types'
import type { FailedCreationDraft } from './failed-creations'
import type { MaskedStartLog } from './masked-start-log'
import type { WorkspaceStartJob, WorkspaceStartResult } from './start-types'

export interface PendingTurn {
  turnId: string
  sessionId: string
  senderUserId: string
}

/** Internal RPC only. Machine requests cannot register sender identities. */
export interface WorkspaceLifecycleEndpoint {
  initializeLifecycle(input: {
    workspaceId: string
    orgId: string
    firstMessage: SendMessageRequest
    firstTurn: PendingTurn
  }): Promise<void>
  readLifecycle(): Promise<DurableLifecycleState | undefined>
  beginLifecycleStart(kind: WorkspaceStart['kind']): Promise<void>
  lifecycleStep(
    id: string,
    label: string,
    state: StartStep['state'],
  ): Promise<void>
  lifecyclePrepared(): Promise<void>
  lifecycleFailed(
    error: NonNullable<DurableLifecycleState['error']>,
  ): Promise<void>
  lifecycleStopped(): Promise<void>
  clearLifecycle(): Promise<void>
  lifecycleActivity(): Promise<void>
  openLifecycleTab(tabId: string): Promise<void>
  closeLifecycleTab(tabId: string): Promise<void>
  credentialSender(turnId: string): Promise<string | null>
  retryFailedCreateCleanup(workspaceId: string): Promise<void>
  finishDiskMaintenance(): Promise<void>
  queueLifecycleStart(job: WorkspaceStartJob): Promise<boolean>
  waitLifecycleStart(): Promise<WorkspaceStartResult>
  waitCreationLifecycle(): Promise<WorkspaceStartResult>
  readCreationLifecycleResult(): Promise<WorkspaceStartResult | undefined>
  readLifecycleStartLog(): Promise<MaskedStartLog>
  retainLifecycleFailedCreation(
    error: FailedCreationDraft['error'],
    fallback?: Omit<FailedCreationDraft, 'error'>,
  ): Promise<void>
}

export interface WorkspaceRuntime {
  env: AppEnv
  dependencies: AppDependencies
  workspace(id: string): WorkspaceLifecycleEndpoint
}

export interface FirstWorkspaceMessage {
  workspaceId: string
  sessionId: string
  turnId: string
  sender: User
  request: SendMessageRequest
}
