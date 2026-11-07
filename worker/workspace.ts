import { DurableObject } from 'cloudflare:workers'
import type { RunnerEvent } from '../src/shared/runner'
import type { StartStep, WorkspaceStart } from '../src/shared/workspaces'
import { WorkspaceChat } from './chat/backend'
import type { DeviceOperationResult } from './devices/internal'
import { DeviceRuntime } from './devices/runtime'
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
import {
  readStartJob,
  type StoredWorkspaceStartJob,
} from './lifecycle/start-job-codec'
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
import {
  scheduleConnectionCheck,
  type ConnectionScheduler,
} from './security/connection-access'

interface WorkspaceEnv extends Omit<LifecycleEnvironment, 'WORKSPACES'> {
  WORKSPACES: DurableObjectNamespace<Workspace>
}

export class Workspace
  extends DurableObject<WorkspaceEnv>
  implements WorkspaceLifecycleTransport
{
  private readonly chat: WorkspaceChat
  private readonly controller: WorkspaceController
  private readonly devices: DeviceRuntime
  private readonly context: DurableObjectState

  constructor(
    context: DurableObjectState,
    env: WorkspaceEnv,
    now: () => number = Date.now,
    scheduleRunnerCheck: ConnectionScheduler = scheduleConnectionCheck,
  ) {
    super(context, env)
    this.context = context
    this.chat = new WorkspaceChat(context.storage, env, {
      scheduleRunnerCheck,
      matchesObject: (workspaceId) =>
        env.WORKSPACES.idFromName(workspaceId).equals(context.id),
      runnerEventStored: async (envelope) => {
        const event = envelope.event
        if (
          event.type === 'turn.completed' ||
          event.type === 'turn.failed' ||
          (event.type === 'runner.event-refused' &&
            (event.runnerEventType === 'turn.completed' ||
              event.runnerEventType === 'turn.failed'))
        )
          context.waitUntil(this.devices.reconcile())
      },
    })
    this.devices = new DeviceRuntime(
      env,
      context.storage,
      this.chat,
      (name) => env.WORKSPACES.idFromName(name).equals(context.id),
      (when) => context.storage.setAlarm(when),
      now,
    )
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

  async queueLifecycleStart(job: StoredWorkspaceStartJob): Promise<boolean> {
    return this.controller.queueLifecycleStart(readStartJob(job))
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

  async lifecycleStopped(): Promise<void> {
    return this.controller.lifecycleStopped()
  }

  async suspendLifecycle(
    workspaceId: string,
    ownerUserId: string,
  ): Promise<boolean> {
    return this.controller.suspendLifecycle(workspaceId, ownerUserId)
  }

  reconcileLifecycleAccess(workspaceId: string): Promise<void> {
    return this.controller.reconcileLifecycleAccess(workspaceId)
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
    await this.controller.alarm()
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
