import type { AgentChoice } from '../../src/shared/generated/AgentChoice'
import type { RunnerLifecycleEvent } from './runner-lifecycle'
import type {
  WorkspaceLifecycleEndpoint,
  PendingTurn,
  LifecycleActivityResult,
} from './workspace-runtime'
import type { ImageCoordinatorState } from './image-timers'
import type {
  DurableLifecycleState,
  LifecyclePublisher,
  LifecycleReconciliation,
} from './durable-types'
import type { LifecycleActivitySnapshot } from './input-activity-state'
import type { WorkspaceResponse } from '../../src/shared/workspaces'
import type { ComputerIdentity } from './computer-ledger'
import type { QueueTurn } from '../chat/queue-turn'

export interface WorkspaceController extends WorkspaceLifecycleEndpoint {
  prepareWorkspaceBase(): Promise<boolean>
  archiveLifecycle(workspaceId: string): Promise<void>
  reserveArchive(workspaceId: string): Promise<void>
  restoreWorkspace(
    orgId: string,
    workspaceId: string,
    userId: string,
    origin: string,
  ): Promise<WorkspaceResponse>
  queueComputerStops(
    orgId: string,
    computers: readonly ComputerIdentity[],
  ): Promise<ComputerIdentity[]>
  lifecycleActivity(checkOnly?: true): Promise<LifecycleActivityResult>
  /** One serial change of the lifecycle state, such as a Restart. */
  changeLifecycle(
    change: (state: DurableLifecycleState) => DurableLifecycleState,
  ): Promise<void>
  extendLifecycleInput(
    operation: () => Promise<LifecycleReconciliation>,
  ): Promise<LifecycleReconciliation | void>
  recordLifecycleInput(at: number): Promise<void>
  captureLifecycleActivity(): Promise<LifecycleActivitySnapshot | undefined>
  reconcileLifecycleActivity(
    snapshot: LifecycleActivitySnapshot,
    remote: LifecycleReconciliation,
  ): Promise<void>
  cancelLifecycleWaiters(): void
  cancelSuspendedLifecycleStart(
    workspaceId: string,
    ownerUserId: string,
  ): Promise<boolean>
  projectDeviceState(
    workspaceId: string,
    choice: AgentChoice | undefined,
    now: number,
    publish: LifecyclePublisher,
  ): Promise<boolean>
  acknowledgeLifecycleFirstMessage(publish?: LifecyclePublisher): Promise<void>
  recoverLifecycle(publish?: LifecyclePublisher): Promise<void>
  registerLifecycleTurn(
    turn: PendingTurn,
    publish?: LifecyclePublisher,
  ): Promise<void>
  finishLifecycleTurn(
    turnId: string,
    publish?: LifecyclePublisher,
  ): Promise<void>
  reportRunnerLifecycle(
    event: RunnerLifecycleEvent,
    publish?: LifecyclePublisher,
  ): Promise<void>
  runnerLifecycleDisconnected(
    publish?: LifecyclePublisher,
    at?: number,
  ): Promise<void>
  runnerProtocolUnsupported(reason: string): Promise<void>
  scheduleImage(state: ImageCoordinatorState): Promise<void>
  alarm(turn?: QueueTurn, restart?: () => Promise<void>): Promise<void>
}
