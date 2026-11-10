import { readChatWorkspaceResponse } from './chat/workspace-response'
import type {
  WorkspaceCompositionEnv,
  WorkspaceChatResolvers,
} from './chat/workspace-integration'
import { AttachmentWorkspace } from './chat/attachment-workspace'
import { lifecycleDependencies } from './lifecycle/runtime'
import { WorkspaceFeatures } from './features/workspace'
import { WorkspaceGitHub } from './features/github'
import {
  WorkspaceMembersReceiver,
  type ReceiverOwnership,
} from './members/workspace-receiver'
import type { WorkspaceDisk } from './members/maintenance-contract'
import type { ImageCoordinatorState } from './lifecycle/image-timers'
import type { GitHubRefresh, GitHubWorkspace } from './github/contracts'
import { handleGitHubRead } from './github/app-handler'
import { hostSurface } from './hosts'
import { readWorkspace, workspaceRecord } from './lifecycle/workspace-data'
import { featureResult } from './features/result'
import { archiveWorkspace } from './lifecycle/archive-workspace'
import { continueBusy } from './lifecycle/continue-admission'
import type { WorkspaceContinue } from './lifecycle/continue'
import { createWorkspaceContinue } from './lifecycle/continue-composition'
import { pendingContinue } from './lifecycle/continue-types'
import type { User } from '../src/shared/api'
import type { ContinueWorkspaceRequest } from '../src/shared/workspaces'
import { resumeCreationCheckpoint } from './members/creation-checkpoint'
import type { ConnectionScheduler } from './security/connection-access'
import { WorkspaceAlarmRunner } from './features/workspace-alarm'

export class Workspace extends AttachmentWorkspace {
  private readonly features: WorkspaceFeatures
  private readonly github: WorkspaceGitHub
  private readonly members: WorkspaceMembersReceiver
  private readonly continuation: WorkspaceContinue
  private readonly now: () => number
  private readonly alarmRunner: WorkspaceAlarmRunner

  constructor(
    context: DurableObjectState,
    env: WorkspaceCompositionEnv,
    now: () => number = Date.now,
    resolvers: WorkspaceChatResolvers = {},
    activitySchedule?: ConnectionScheduler,
  ) {
    super(context, env, now, resolvers, activitySchedule)
    this.now = now
    const dependencies = {
      ...lifecycleDependencies(),
      now,
      terminalSchedule: activitySchedule,
    }
    const matches = (id: string) =>
      env.WORKSPACES.idFromName(id).equals(context.id)
    this.features = new WorkspaceFeatures(
      env,
      dependencies,
      this.integration.files,
      matches,
      async (workspaceId, at) => {
        await this.integration.storage.put('previews:workspace-id', workspaceId)
        await this.integration.alarms.set('previews', at)
      },
      (id, at) => this.activity.record(id, at),
      (id, ids, queueOwned) =>
        queueOwned
          ? this.chat.commitPreviewRevocations(id, ids)
          : this.chat.runLifecycle(() =>
              this.chat.commitPreviewRevocations(id, ids),
            ),
    )
    this.integration.onStopped((id) => this.features.revokeWorkspace(id, true))
    this.github = new WorkspaceGitHub(
      this.integration.storage,
      env,
      dependencies,
      this.chat,
      matches,
      this.integration.alarms,
    )
    this.members = new WorkspaceMembersReceiver(
      context.storage,
      this.chat,
      this.features,
      now,
    )
    this.continuation = createWorkspaceContinue({
      matches,
      env,
      dependencies,
      integration: this.integration,
      github: this.github,
      run: (operation) => this.run(operation),
    })
    this.alarmRunner = new WorkspaceAlarmRunner({
      context,
      env,
      now,
      alarms: this.integration.alarms,
      storage: this.integration.storage,
      browsers: this.chat.browsers,
      runner: this.chat.runner.connections,
      devices: this.devices,
      members: this.members,
      github: this.github,
      continuation: this.continuation,
      features: this.features,
      lifecycle: () => this.alarmLifecycle(),
    })
  }

  refreshGitHub(workspace: GitHubWorkspace, signal: GitHubRefresh) {
    return featureResult(() => this.github.refresh(workspace, signal))
  }

  suspendMemberLifecycle(
    ownership: ReceiverOwnership,
    workspaceId: string | null,
  ) {
    return featureResult(async () => {
      await this.continuation.cancel()
      await this.members.suspend(ownership, workspaceId)
      this.controller.cancelLifecycleWaiters()
      await this.integration.reconcileStopped()
    })
  }
  restoreMemberLifecycle(
    ownership: ReceiverOwnership,
    disk: WorkspaceDisk | null,
    image: ImageCoordinatorState | null,
  ) {
    return featureResult(() => this.members.restore(ownership, disk, image))
  }
  deleteMemberWorkspaceState(ownership: ReceiverOwnership) {
    return featureResult(() => this.members.remove(ownership))
  }

  resumeMemberCreation(orgId: string, workspaceId: string, userId: string) {
    return featureResult(() =>
      this.run(() =>
        resumeCreationCheckpoint(
          this.integration.storage,
          this.env,
          { ...lifecycleDependencies(), now: this.now },
          this.controller,
          orgId,
          workspaceId,
          userId,
        ),
      ),
    )
  }

  readChatWorkspaceResponse(
    orgId: string,
    workspaceId: string,
    origin: string,
  ) {
    return this.chat.runLifecycle(() =>
      readChatWorkspaceResponse(
        this.env,
        this.chat.store,
        orgId,
        workspaceId,
        origin,
        () => this.controller.readLifecycle(),
        () => this.controller.readLifecycleStartLog(),
      ),
    )
  }

  async publishWorkspaceMetadata(
    orgId: string,
    workspaceId: string,
  ): Promise<void> {
    if (!this.env.WORKSPACES.idFromName(workspaceId).equals(this.ctx.id)) return
    await this.chat.runLifecycle(async () => {
      const workspace = workspaceRecord(
        await readWorkspace(this.env.DB, orgId, workspaceId),
      )
      await this.chat.commitWorkspaceEvent(workspaceId, {
        type: 'workspace.updated',
        workspace,
      })
    })
  }

  alarm(): Promise<void> {
    return this.alarmRunner.alarm()
  }

  protected settledAlarms(): Promise<void> {
    return this.alarmRunner.settled()
  }

  async fetch(request: Request): Promise<Response> {
    if (hostSurface(request, this.env) === 'preview')
      return this.features.previews.proxy(request)
    const feature = await this.features.fetch(request)
    if (feature) return feature
    if (/\/github(?:\/checks)?$/.test(new URL(request.url).pathname))
      return handleGitHubRead(request, this.env, {
        now: this.now,
        refresh: (workspace, signal) => this.github.refresh(workspace, signal),
      })
    if (/\/github\/.*$/.test(new URL(request.url).pathname))
      return this.github.fetch(request)
    return this.fetchChat(request)
  }

  archiveWorkspace(
    orgId: string,
    workspaceId: string,
    userId: string,
    origin: string,
  ) {
    return featureResult(() =>
      this.run(async () => {
        if (await pendingContinue(this.integration.storage))
          throw continueBusy()
        return archiveWorkspace(
          this.env,
          { ...lifecycleDependencies(), now: this.now },
          orgId,
          workspaceId,
          userId,
          origin,
          {
            archiveLifecycle: () =>
              this.controller.archiveLifecycle(workspaceId),
            reserveArchive: () => this.controller.reserveArchive(workspaceId),
          },
        )
      }),
    )
  }

  restoreWorkspace(
    orgId: string,
    workspaceId: string,
    userId: string,
    origin: string,
  ) {
    return featureResult(() =>
      this.run(() =>
        this.controller.restoreWorkspace(orgId, workspaceId, userId, origin),
      ),
    )
  }

  continueWorkspace(
    orgId: string,
    id: string,
    user: User,
    request: ContinueWorkspaceRequest,
    origin: string,
  ) {
    return featureResult(() =>
      this.continuation.start(orgId, id, user, request, origin),
    )
  }

  readWorkspaceContinue(
    orgId: string,
    id: string,
    userId: string,
    continueId: string,
    origin: string,
  ) {
    return featureResult(() =>
      this.continuation.result(orgId, id, userId, continueId, origin),
    )
  }

  async credentialSender(turnId: string): Promise<string | null> {
    const continued = await this.continuation.credentialSender(turnId)
    return continued === undefined ? super.credentialSender(turnId) : continued
  }

  async lifecycleStopped(): Promise<void> {
    await this.continuation.cancel()
    return super.lifecycleStopped()
  }
}
