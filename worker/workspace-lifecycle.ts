import { WorkspaceObjectBase } from './lifecycle/workspace-object-base'
import type { RunnerLifecycleEvent } from './lifecycle/runner-lifecycle'
import type { UserMessage } from '../src/shared/messages'
import type { ChatWorkspaceSummary } from './chat/workspace-summary'
import type { StartStep, WorkspaceStart } from '../src/shared/workspaces'
import type { DeviceOperationResult } from './devices/internal'
import { activeStoredTurn } from './devices/access'
import {
  checkWorkspaceTurnToken,
  credentialSender,
} from './lifecycle/credential-sender'
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
import { readEncryptedStartLog } from './lifecycle/start-storage'
import {
  startResultForTransport,
  type WorkspaceLifecycleTransport,
} from './lifecycle/workspace-transport'
import type { WorkspaceStartIntent } from './lifecycle/start-types'
import { recordWorkspaceActivity } from './lifecycle/create-input-activity'
import type { ComputerIdentity } from './lifecycle/computer-ledger'
import { featureResult } from './features/result'
import { acceptLifecycleMessage } from './lifecycle/workspace-first-message'

export class WorkspaceLifecycle
  extends WorkspaceObjectBase
  implements WorkspaceLifecycleTransport
{
  activateImportedWorkspace(orgId: string, id: string, userId: string) {
    return featureResult(() =>
      this.run(() =>
        this.controller.activateImportedWorkspace(orgId, id, userId),
      ),
    )
  }

  activationCredentialSender(id: string) {
    return this.chat.runLifecycle(() =>
      this.controller.activationCredentialSender(id),
    )
  }

  sendImportCommand(
    id: string,
    command: Parameters<WorkspaceLifecycleEndpoint['sendImportCommand']>[1],
  ) {
    return this.run(() => this.controller.sendImportCommand(id, command))
  }

  seedImportSession(
    id: string,
    input: Parameters<WorkspaceLifecycleEndpoint['seedImportSession']>[1],
  ) {
    return this.run(() => this.controller.seedImportSession(id, input))
  }

  async callingToolTurn(workspaceId: string, turnId: string) {
    if (!this.env.WORKSPACES.idFromName(workspaceId).equals(this.ctx.id))
      return null
    return this.chat.runLifecycle(async () => {
      const turn = await activeStoredTurn(this.chat, workspaceId, turnId)
      return turn ? { workspaceId, turnId, senderUserId: turn.senderId } : null
    })
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
    return this.run(() =>
      acceptLifecycleMessage(this.chat, this.controller, first),
    )
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
    return recordWorkspaceActivity(
      this.integration,
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

  checkTurnToken(token: string) {
    return checkWorkspaceTurnToken(this.chat, token)
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
    return this.devices.operation(target, operation)
  }

  protected async fetchChat(request: Request): Promise<Response> {
    const deviceResponse = await this.devices.fetch(request)
    if (deviceResponse) return deviceResponse
    const response = await this.chat.fetch(request)
    if (request.method !== 'GET' && request.method !== 'HEAD')
      this.context.waitUntil(this.devices.reconcile())
    return response
  }
}
