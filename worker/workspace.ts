import { DurableObject } from 'cloudflare:workers'
import type { RunnerEvent } from '../src/shared/runner'
import type { StartStep, WorkspaceStart } from '../src/shared/workspaces'
import { WorkspaceChat } from './chat/backend'
import type { DurableLifecycleState } from './lifecycle/durable-types'
import type { FailedCreationDraft } from './lifecycle/failed-creations'
import type { ImageCoordinatorState } from './lifecycle/image-timers'
import {
  lifecycleDependencies,
  type LifecycleEnvironment,
} from './lifecycle/runtime'
import type {
  PendingTurn,
  WorkspaceLifecycleEndpoint,
} from './lifecycle/workspace-runtime'
import type { WorkspaceStartJob } from './lifecycle/start-types'
import { nativeWorkspaceStorage } from './lifecycle/platform-storage'
import { readEncryptedStartLog } from './lifecycle/start-storage'
import {
  startResultForTransport,
  type WorkspaceLifecycleTransport,
} from './lifecycle/workspace-transport'
import { createWorkspaceController } from './lifecycle/workspace-controller'
import type { WorkspaceController } from './lifecycle/workspace-controller-types'
import { nativeWorkspacePlatform } from './lifecycle/workspace-platform'
import { failedCreationEvents } from './lifecycle/failed-creation-events'

export class Workspace
  extends DurableObject<LifecycleEnvironment>
  implements WorkspaceLifecycleTransport
{
  private readonly chat: WorkspaceChat
  private readonly controller: WorkspaceController

  constructor(context: DurableObjectState, env: LifecycleEnvironment) {
    super(context, env)
    this.chat = new WorkspaceChat(context.storage, env, {
      matchesObject: (workspaceId) =>
        env.WORKSPACES.idFromName(workspaceId).equals(context.id),
    })
    this.controller = createWorkspaceController(
      env,
      lifecycleDependencies(),
      nativeWorkspacePlatform(context, (envelope) =>
        this.chat.appendWorkspaceEvent(
          envelope.workspaceId,
          envelope.event,
          envelope.occurredAt,
        ),
      ),
    )
  }

  async queueLifecycleStart(job: WorkspaceStartJob): Promise<boolean> {
    return this.controller.queueLifecycleStart(job)
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
    return this.controller.retainLifecycleFailedCreation(error, fallback)
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
    return this.controller.initializeLifecycle(input)
  }

  readLifecycle() {
    return this.controller.readLifecycle()
  }

  async beginLifecycleStart(kind: WorkspaceStart['kind']) {
    return this.controller.beginLifecycleStart(kind)
  }

  lifecycleStep(id: string, label: string, state: StartStep['state']) {
    return this.controller.lifecycleStep(id, label, state)
  }

  async lifecyclePrepared() {
    return this.controller.lifecyclePrepared()
  }

  lifecycleFailed(error: NonNullable<DurableLifecycleState['error']>) {
    return this.controller.lifecycleFailed(error)
  }

  lifecycleActivity() {
    return this.controller.lifecycleActivity()
  }

  async openLifecycleTab(tabId: string) {
    return this.controller.openLifecycleTab(tabId)
  }

  async closeLifecycleTab(tabId: string) {
    return this.controller.closeLifecycleTab(tabId)
  }

  async lifecycleStopped(): Promise<void> {
    return this.controller.lifecycleStopped()
  }

  async clearLifecycle(): Promise<void> {
    return this.controller.clearLifecycle()
  }

  async acknowledgeLifecycleFirstMessage(): Promise<void> {
    return this.controller.acknowledgeLifecycleFirstMessage()
  }

  async registerLifecycleTurn(turn: PendingTurn): Promise<void> {
    return this.controller.registerLifecycleTurn(turn)
  }

  async finishLifecycleTurn(turnId: string): Promise<void> {
    return this.controller.finishLifecycleTurn(turnId)
  }

  async credentialSender(turnId: string): Promise<string | null> {
    return this.controller.credentialSender(turnId)
  }

  async reportRunnerLifecycle(event: RunnerEvent): Promise<void> {
    return this.controller.reportRunnerLifecycle(event)
  }

  async runnerLifecycleDisconnected(): Promise<void> {
    return this.controller.runnerLifecycleDisconnected()
  }

  async scheduleImage(state: ImageCoordinatorState): Promise<void> {
    return this.controller.scheduleImage(state)
  }

  async retryFailedCreateCleanup(workspaceId: string): Promise<void> {
    return this.controller.retryFailedCreateCleanup(workspaceId)
  }

  async finishDiskMaintenance(): Promise<void> {
    return this.controller.finishDiskMaintenance()
  }

  async alarm(): Promise<void> {
    return this.controller.alarm()
  }

  async fetch(request: Request): Promise<Response> {
    const response = await this.chat.fetch(request)
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
