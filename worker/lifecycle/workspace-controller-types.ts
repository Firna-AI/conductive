import type { RunnerEvent } from '../../src/shared/runner'
import type { AgentChoice } from '../../src/shared/agents'
import type {
  WorkspaceLifecycleEndpoint,
  PendingTurn,
  LifecycleActivityResult,
} from './workspace-runtime'
import type { ImageCoordinatorState } from './image-timers'
import type {
  LifecyclePublisher,
  LifecycleReconciliation,
} from './durable-types'
import type { LifecycleActivitySnapshot } from './input-activity-state'

export interface WorkspaceController extends WorkspaceLifecycleEndpoint {
  lifecycleActivity(checkOnly?: true): Promise<LifecycleActivityResult>
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
    occurredAt?: number,
  ): Promise<void>
  reportRunnerLifecycle(
    event: RunnerEvent,
    publish?: LifecyclePublisher,
    occurredAt?: number,
  ): Promise<void>
  runnerLifecycleDisconnected(publish?: LifecyclePublisher): Promise<void>
  scheduleImage(state: ImageCoordinatorState): Promise<void>
  alarm(): Promise<void>
}
