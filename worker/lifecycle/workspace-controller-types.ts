import type { RunnerEvent } from '../../src/shared/runner'
import type {
  WorkspaceLifecycleEndpoint,
  PendingTurn,
} from './workspace-runtime'
import type { FailedCreationDraft } from './failed-creations'
import type { ImageCoordinatorState } from './image-timers'

export interface WorkspaceController extends WorkspaceLifecycleEndpoint {
  failedLifecycleCreation(
    orgId: string,
    senderUserId: string,
  ): Promise<FailedCreationDraft | undefined>
  acknowledgeLifecycleFirstMessage(): Promise<void>
  registerLifecycleTurn(turn: PendingTurn): Promise<void>
  finishLifecycleTurn(turnId: string): Promise<void>
  reportRunnerLifecycle(event: RunnerEvent): Promise<void>
  runnerLifecycleDisconnected(): Promise<void>
  scheduleImage(state: ImageCoordinatorState): Promise<void>
  alarm(): Promise<void>
  fetch(request: Request): Promise<Response>
}
