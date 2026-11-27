import { rememberWorkerVersion } from './lifecycle/job-steps'
import { DurableObject } from 'cloudflare:workers'
import type { UserMessage } from '../src/shared/generated/UserMessage'
import type { StartStep } from '../src/shared/generated/StartStep'
import type { WorkspaceStart } from '../src/shared/generated/WorkspaceStart'
import type { RunnerLifecycleEvent } from './lifecycle/runner-lifecycle'
import type { ChatWorkspaceSummaryOptions } from './chat/workspace-summary'
import { waitingSummary } from './lifecycle/waiting-summary'
import { WorkspaceChat } from './chat/backend'
import { runWorkspaceLifecycle } from './chat/lifecycle-queue'
import type { QueueTurn } from './chat/queue-turn'
import type { DeviceOperationResult } from './devices/internal'
import {
  createWorkspaceIntegration,
  type WorkspaceCompositionEnv,
} from './chat/workspace-integration'
import type { WorkspaceChatResolvers } from './chat/workspace-resolvers'
import { DeviceRuntime } from './devices/runtime'
import { activeStoredTurn } from './devices/access'
import { credentialSender } from './lifecycle/credential-sender'
import type { DurableLifecycleState } from './lifecycle/durable-types'
import type { ImageCoordinatorState } from './lifecycle/image-timers'
import type {
  PendingTurn,
  FirstWorkspaceMessage,
  WorkspaceLifecycleEndpoint,
} from './lifecycle/workspace-runtime'
import {
  readStartJob,
  type StoredWorkspaceStartJob,
} from './lifecycle/start-job-codec'
import { nativeWorkspaceStorage } from './lifecycle/platform-storage'
import { readEncryptedStartLog } from './lifecycle/start-log-storage'
import {
  startResultForTransport,
  type WorkspaceLifecycleTransport,
} from './lifecycle/workspace-transport'
import type { WorkspaceController } from './lifecycle/workspace-controller-types'
import type { WorkspaceStartIntent } from './lifecycle/start-types'
import { createWorkspaceInputActivity } from './lifecycle/create-input-activity'
import { lifecycleDependencies } from './lifecycle/runtime'
import type { ConnectionScheduler } from './security/connection-access'
import type { ComputerIdentity } from './lifecycle/computer-ledger'
import type { TurnTokenCheck } from './model-gateway/types'
import { fetchWorkspaceFeatures } from './chat/fetch-workspace-features'

export class WorkspaceLifecycle
  extends DurableObject<WorkspaceCompositionEnv>
  implements WorkspaceLifecycleTransport
{
  protected readonly chat: WorkspaceChat
  protected readonly controller: WorkspaceController
  protected readonly devices: DeviceRuntime
  protected readonly context: DurableObjectState
  protected readonly activity: ReturnType<typeof createWorkspaceInputActivity>
  private readonly activityNow: () => number

  protected readonly integration: ReturnType<typeof createWorkspaceIntegration>

  constructor(
    context: DurableObjectState,
    env: WorkspaceCompositionEnv,
    now: () => number = Date.now,
    resolvers: WorkspaceChatResolvers = {},
    activitySchedule?: ConnectionScheduler,
  ) {
    super(context, env)
    rememberWorkerVersion(env)
    this.context = context
    this.activityNow = now
    const integration = createWorkspaceIntegration(context, env, now, resolvers)
    this.integration = integration
    this.chat = integration.chat
    this.devices = integration.devices
    this.controller = integration.controller
    context.blockConcurrencyWhile(() => integration.sockets.restore())
    this.activity = createWorkspaceInputActivity(
      context,
      env,
      { ...lifecycleDependencies(), now },
      integration,
      (operation) =>
        this.chat.runLifecycle((turn) =>
          integration.withGeneration(turn, operation),
        ),
      activitySchedule,
    )
  }

  protected run<T>(operation: (turn: QueueTurn) => Promise<T>): Promise<T> {
    return runWorkspaceLifecycle(this.integration, operation)
  }

  async callingToolTurn(workspaceId: string, turnId: string) {
    if (!this.env.WORKSPACES.idFromName(workspaceId).equals(this.ctx.id))
      return null
    return this.chat.runLifecycle(async () => {
      const turn = await activeStoredTurn(this.chat, workspaceId, turnId)
      return turn ? { workspaceId, turnId, senderUserId: turn.senderId } : null
    })
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    return this.integration.sockets.message(socket, message)
  }

  webSocketClose(socket: WebSocket) {
    return this.integration.sockets.close(socket)
  }

  webSocketError(socket: WebSocket) {
    return this.integration.sockets.close(socket)
  }

  queueComputerStops(
    orgId: string,
    computers: readonly ComputerIdentity[],
  ): Promise<ComputerIdentity[]> {
    return this.run(() => this.controller.queueComputerStops(orgId, computers))
  }

  async queueLifecycleStart(
    job: StoredWorkspaceStartJob,
    intent?: WorkspaceStartIntent,
  ): Promise<boolean> {
    const parsed = readStartJob(job)
    return this.run(() => this.controller.queueLifecycleStart(parsed, intent))
  }

  async acceptLifecycleFirstMessage(
    first: FirstWorkspaceMessage,
  ): Promise<UserMessage> {
    return this.run(async () => {
      const message = await this.chat.acceptFirstMessage(first)
      await this.controller.acknowledgeLifecycleFirstMessage()
      return message
    })
  }

  readChatWorkspaceSummary(options?: ChatWorkspaceSummaryOptions) {
    return waitingSummary(this.chat, () => this.readLifecycle(), options)
  }

  async waitLifecycleStart() {
    return startResultForTransport(
      await this.controller.waitLifecycleStart(),
      () => this.readLifecycleStartLog(),
    )
  }
  async waitCreationLifecycle() {
    return startResultForTransport(
      await this.controller.waitCreationLifecycle(),
      () => this.readLifecycleStartLog(),
    )
  }
  async waitCreationAdmission(timeoutMs?: number) {
    return this.controller.waitCreationAdmission(timeoutMs)
  }
  async readCreationLifecycleResult() {
    const result = await this.controller.readCreationLifecycleResult()
    return result
      ? startResultForTransport(result, () => this.readLifecycleStartLog())
      : undefined
  }

  readLifecycleStartLog() {
    return readEncryptedStartLog(
      nativeWorkspaceStorage(this.integration.storage),
    )
  }

  async initializeLifecycle(
    input: Parameters<WorkspaceLifecycleEndpoint['initializeLifecycle']>[0],
  ): Promise<void> {
    return this.run(() => this.controller.initializeLifecycle(input))
  }

  readLifecycle() {
    return this.chat.runLifecycle(() => this.controller.readLifecycle())
  }

  async beginLifecycleStart(kind: WorkspaceStart['kind']) {
    return this.run(() => this.controller.beginLifecycleStart(kind))
  }

  lifecycleStep(id: string, label: string, state: StartStep['state']) {
    return this.run(() => this.controller.lifecycleStep(id, label, state))
  }

  async lifecyclePrepared() {
    return this.run(() => this.controller.lifecyclePrepared())
  }

  lifecycleFailed(error: NonNullable<DurableLifecycleState['error']>) {
    return this.run(() => this.controller.lifecycleFailed(error))
  }

  async lifecycleActivity() {
    const at = this.activityNow()
    return this.chat.runLifecycle((turn) =>
      this.integration.withGeneration(turn, async () => {
        const state = await this.controller.readLifecycle()
        const result = await this.controller.lifecycleActivity(true)
        if (result.ok && state) this.activity.record(state.workspaceId, at)
        return result
      }),
    )
  }

  async lifecycleStopped(): Promise<void> {
    return this.run(() => this.controller.lifecycleStopped())
  }

  async suspendLifecycle(
    workspaceId: string,
    ownerUserId: string,
  ): Promise<boolean> {
    if (
      await this.controller.cancelSuspendedLifecycleStart(
        workspaceId,
        ownerUserId,
      )
    )
      return false
    return this.run(() =>
      this.controller.suspendLifecycle(workspaceId, ownerUserId),
    )
  }

  reconcileLifecycleAccess(workspaceId: string): Promise<void> {
    return this.run(() => this.controller.reconcileLifecycleAccess(workspaceId))
  }

  async clearLifecycle(): Promise<void> {
    return this.run(() => this.controller.clearLifecycle())
  }

  async acknowledgeLifecycleFirstMessage(): Promise<void> {
    return this.run(() => this.controller.acknowledgeLifecycleFirstMessage())
  }

  async registerLifecycleTurn(turn: PendingTurn): Promise<void> {
    return this.run(() => this.controller.registerLifecycleTurn(turn))
  }

  async finishLifecycleTurn(turnId: string): Promise<void> {
    return this.run(() => this.controller.finishLifecycleTurn(turnId))
  }

  async credentialSender(turnId: string): Promise<string | null> {
    return credentialSender(this.chat, this.controller, turnId)
  }

  async checkTurnToken(
    token: string,
    claimCodexRecovery?: true | 'complete',
  ): Promise<TurnTokenCheck> {
    const workspaceId = await this.chat.store.workspaceId()
    return workspaceId
      ? this.chat.turnTokens.check(workspaceId, token, claimCodexRecovery)
      : { ok: false, reason: 'turn_not_active' }
  }

  async reportRunnerLifecycle(event: RunnerLifecycleEvent): Promise<void> {
    return this.run(() => this.controller.reportRunnerLifecycle(event))
  }

  async runnerLifecycleDisconnected(): Promise<void> {
    return this.run(() => this.controller.runnerLifecycleDisconnected())
  }

  async scheduleImage(state: ImageCoordinatorState): Promise<void> {
    return this.run(() => this.controller.scheduleImage(state))
  }

  async retryFailedCreateCleanup(workspaceId: string): Promise<void> {
    return this.run(() => this.controller.retryFailedCreateCleanup(workspaceId))
  }

  async finishDiskMaintenance(): Promise<void> {
    return this.run(() => this.controller.finishDiskMaintenance())
  }

  protected alarmLifecycle(restart?: () => Promise<void>): Promise<void> {
    const advance = (turn: QueueTurn) => this.controller.alarm(turn, restart)
    return this.run(this.integration.startRecords.queued(advance))
  }

  deviceOperation(
    target: string,
    operation: unknown,
  ): Promise<DeviceOperationResult> {
    return this.devices.operation(target, operation)
  }

  protected async fetchChat(request: Request): Promise<Response> {
    return fetchWorkspaceFeatures(this.integration, this.context, request)
  }
}
