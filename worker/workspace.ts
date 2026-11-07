import { DurableObject } from 'cloudflare:workers'
import type { RunnerEvent } from '../src/shared/runner'
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
import type { DurableLifecycleState } from './lifecycle/durable-types'
import type { FailedCreationDraft } from './lifecycle/failed-creations'
import type { ImageCoordinatorState } from './lifecycle/image-timers'
import type {
  PendingTurn,
  FirstWorkspaceMessage,
  WorkspaceLifecycleEndpoint,
} from './lifecycle/workspace-runtime'
import type { WorkspaceStartJob } from './lifecycle/start-types'
import { nativeWorkspaceStorage } from './lifecycle/platform-storage'
import { readEncryptedStartLog } from './lifecycle/start-storage'
import {
  startResultForTransport,
  type WorkspaceLifecycleTransport,
} from './lifecycle/workspace-transport'
import type { WorkspaceController } from './lifecycle/workspace-controller-types'
import { failedCreationEvents } from './lifecycle/failed-creation-events'

export class Workspace
  extends DurableObject<WorkspaceCompositionEnv>
  implements WorkspaceLifecycleTransport
{
  private readonly chat: WorkspaceChat
  private readonly controller: WorkspaceController
  private readonly devices: DeviceRuntime
  private readonly context: DurableObjectState

  constructor(
    context: DurableObjectState,
    env: WorkspaceCompositionEnv,
    now: () => number = Date.now,
    resolvers: WorkspaceChatResolvers = {},
  ) {
    super(context, env)
    this.context = context
    const integration = createWorkspaceIntegration(context, env, now, resolvers)
    this.chat = integration.chat
    this.devices = integration.devices
    this.controller = integration.controller
  }

  private run<T>(operation: () => Promise<T>): Promise<T> {
    return this.chat.runLifecycle(async () => {
      const result = await operation()
      await this.chat.flushRunner()
      return result
    })
  }

  async queueLifecycleStart(job: WorkspaceStartJob): Promise<boolean> {
    return this.run(() => this.controller.queueLifecycleStart(job))
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
  async waitCreationAdmission() {
    return this.controller.waitCreationAdmission()
  }
  async readCreationLifecycleResult() {
    const result = await this.controller.readCreationLifecycleResult()
    return result
      ? startResultForTransport(result, () => this.readLifecycleStartLog())
      : undefined
  }

  readLifecycleStartLog() {
    return readEncryptedStartLog(nativeWorkspaceStorage(this.ctx.storage))
  }

  async retainLifecycleFailedCreation(
    error: FailedCreationDraft['error'],
    fallback?: Omit<FailedCreationDraft, 'error'>,
  ): Promise<void> {
    return this.run(() =>
      this.controller.retainLifecycleFailedCreation(error, fallback),
    )
  }

  async failedLifecycleCreation(
    orgId: string,
    senderUserId: string,
  ): Promise<FailedCreationDraft | undefined> {
    return this.controller.failedLifecycleCreation(orgId, senderUserId)
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
    return this.run(() => this.controller.lifecycleActivity())
  }

  async openLifecycleTab(tabId: string) {
    return this.run(() => this.controller.openLifecycleTab(tabId))
  }

  async closeLifecycleTab(tabId: string) {
    return this.run(() => this.controller.closeLifecycleTab(tabId))
  }

  async lifecycleStopped(): Promise<void> {
    return this.run(() => this.controller.lifecycleStopped())
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
    return this.chat.runLifecycle(() =>
      this.controller.credentialSender(turnId),
    )
  }

  async reportRunnerLifecycle(event: RunnerEvent): Promise<void> {
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

  async alarm(): Promise<void> {
    await this.run(() => this.controller.alarm())
    await this.devices.alarm()
  }

  deviceOperation(
    target: string,
    operation: unknown,
  ): Promise<DeviceOperationResult> {
    return this.devices.operation(target, operation)
  }

  async fetch(request: Request): Promise<Response> {
    const deviceResponse = await this.devices.fetch(request)
    if (deviceResponse) return deviceResponse
    const response = await this.chat.fetch(request)
    if (request.method !== 'GET' && request.method !== 'HEAD')
      this.context.waitUntil(this.devices.reconcile())
    if (response.status !== 404) return response
    return (
      (await failedCreationEvents(
        request,
        this.env,
        this.controller,
        (id) => this.env.WORKSPACES.idFromName(id).equals(this.ctx.id),
        (id, after) =>
          this.chat.store.run(() =>
            this.chat.store.read(id, (view) => view.history(after)),
          ),
      )) ?? response
    )
  }
}
