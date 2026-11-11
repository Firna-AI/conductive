import { DurableObject } from 'cloudflare:workers'
import type { RunnerLifecycleEvent } from './lifecycle/runner-lifecycle'
import type { UserMessage } from '../src/shared/messages'
import type { ChatWorkspaceSummary } from './chat/workspace-summary'
import type { StartStep, WorkspaceStart } from '../src/shared/workspaces'
import { WorkspaceChat } from './chat/backend'
import type { DeviceOperationResult } from './devices/internal'
import {
  createWorkspaceIntegration,
  type WorkspaceCompositionEnv,
  type WorkspaceChatResolvers,
} from './chat/workspace-integration'
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
import type { WorkspaceLifecycleTransport } from './lifecycle/workspace-transport'
import type { WorkspaceController } from './lifecycle/workspace-controller-types'
import type { WorkspaceStartIntent } from './lifecycle/start-types'
import { createWorkspaceInputActivity } from './lifecycle/create-input-activity'
import { lifecycleDependencies } from './lifecycle/runtime'
import type { ConnectionScheduler } from './security/connection-access'
import type { WorkspaceErrorReporting } from './error-reporting/workspace'
import {
  checkWorkspaceTurnToken,
  recordWorkspaceActivity,
  readWorkspaceLog,
  runWorkspaceLifecycle,
  workspaceStartResults,
} from './lifecycle/run-workspace'
import type { ComputerIdentity } from './lifecycle/computer-ledger'
import type { TurnTokenCheck } from './model-gateway/types'

export class WorkspaceLifecycle
  extends DurableObject<WorkspaceCompositionEnv>
  implements WorkspaceLifecycleTransport
{
  protected readonly chat: WorkspaceChat
  protected readonly controller: WorkspaceController
  protected readonly devices: DeviceRuntime
  protected readonly context: DurableObjectState
  protected readonly reporting: WorkspaceErrorReporting
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
    this.context = context
    this.activityNow = now
    const integration = createWorkspaceIntegration(context, env, now, resolvers)
    this.integration = integration
    this.reporting = integration.reporting
    this.chat = integration.chat
    this.devices = integration.devices
    this.controller = integration.controller
    context.blockConcurrencyWhile(() =>
      this.reporting.background(() => integration.sockets.restore()),
    )
    this.activity = createWorkspaceInputActivity(
      context,
      env,
      {
        ...lifecycleDependencies(),
        now,
        errorReporting: this.reporting.runtime,
      },
      integration,
      (operation) =>
        this.chat.runLifecycle(() => integration.withGeneration(operation)),
      activitySchedule,
    )
  }

  protected run<T>(operation: () => Promise<T>): Promise<T> {
    return runWorkspaceLifecycle(
      this.chat,
      this.integration.withGeneration,
      this.reporting,
      operation,
    )
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
    return this.reporting.background(() =>
      this.integration.sockets.message(socket, message),
    )
  }

  webSocketClose(socket: WebSocket) {
    return this.reporting.background(() =>
      this.integration.sockets.close(socket),
    )
  }

  webSocketError(socket: WebSocket) {
    return this.webSocketClose(socket)
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

  async readChatWorkspaceSummary(): Promise<ChatWorkspaceSummary> {
    return this.chat.workspaceSummary()
  }

  async waitLifecycleStart() {
    return workspaceStartResults.waitLifecycleStart(this.controller, this)
  }
  async waitCreationLifecycle() {
    return workspaceStartResults.waitCreationLifecycle(this.controller, this)
  }
  async waitCreationAdmission() {
    return this.controller.waitCreationAdmission()
  }
  readCreationLifecycleResult() {
    return workspaceStartResults.readCreation(this.controller, this)
  }

  readLifecycleStartLog() {
    return readWorkspaceLog(this.integration.storage)
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

  lifecycleActivity() {
    return recordWorkspaceActivity(
      this.chat,
      this.integration.withGeneration,
      this.controller,
      this.activity,
      this.activityNow(),
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
    return checkWorkspaceTurnToken(this.chat, token, claimCodexRecovery)
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

  protected async alarmLifecycle(): Promise<void> {
    await this.run(() => this.controller.alarm())
  }

  deviceOperation(
    target: string,
    operation: unknown,
  ): Promise<DeviceOperationResult> {
    return this.reporting.run(() => this.devices.operation(target, operation))
  }

  protected async fetchChat(request: Request): Promise<Response> {
    const deviceResponse = await this.devices.fetch(request)
    if (deviceResponse) return deviceResponse
    const response = await this.chat.fetch(request)
    if (request.method !== 'GET' && request.method !== 'HEAD')
      this.context.waitUntil(
        this.reporting.background(() => this.devices.reconcile()),
      )
    return response
  }
}
