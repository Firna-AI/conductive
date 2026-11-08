import type { RunnerEvent } from '../../src/shared/runner'
import type { AgentChoice } from '../../src/shared/agents'
import type {
  WorkspaceLifecycleEndpoint,
  PendingTurn,
} from './workspace-runtime'
import type { FailedCreationDraft } from './failed-creations'
import type { ImageCoordinatorState } from './image-timers'
import type { LifecyclePublisher } from './durable-types'

export interface WorkspaceController extends WorkspaceLifecycleEndpoint {
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
  failedLifecycleCreation(
    orgId: string,
    senderUserId: string,
  ): Promise<FailedCreationDraft | undefined>
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
