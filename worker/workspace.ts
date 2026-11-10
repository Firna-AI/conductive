import { readChatWorkspaceResponse } from './chat/workspace-response'
import type {
  WorkspaceCompositionEnv,
  WorkspaceChatResolvers,
} from './chat/workspace-integration'
import { AttachmentWorkspace } from './chat/attachment-workspace'
import { lifecycleDependencies, workspaceRuntime } from './lifecycle/runtime'
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
import { WorkspaceArchive } from './features/archive'
import { WorkspaceContinue } from './lifecycle/continue'
import { pendingContinue } from './lifecycle/continue-types'
import { resumeWorkspace } from './lifecycle/workspace-resume'
import type { User } from '../src/shared/api'
import type { ContinueWorkspaceRequest } from '../src/shared/workspaces'
import { assertReceiverActive } from './members/receiver-fence'
import { orgLifecycleActive } from './members/composition-data'
import { resumeCreationCheckpoint } from './members/creation-checkpoint'
import { expireWorkspacePreviews, runWorkspaceAlarms } from './workspace-alarms'
import type { ConnectionScheduler } from './security/connection-access'

export class Workspace extends AttachmentWorkspace {
  private readonly features: WorkspaceFeatures
  private readonly github: WorkspaceGitHub
  private readonly members: WorkspaceMembersReceiver
  private readonly archives: WorkspaceArchive
  private readonly continuation: WorkspaceContinue
  private readonly now: () => number

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
    this.archives = new WorkspaceArchive(env, dependencies, {
      ...this.integration,
      run: (operation) => this.run(operation),
      revoke: (id) => this.features.revokeWorkspace(id, true),
    })
    this.continuation = new WorkspaceContinue({
      matches,
      assertActive: () => assertReceiverActive(this.integration.storage),
      activity: async () => {
        await this.controller.lifecycleActivity()
      },
      env,
      dependencies,
      storage: this.integration.storage,
      chat: this.chat,
      run: (operation) => this.run(operation),
      schedule: (at) => this.integration.alarms.set('continue', at),
      refresh: (workspace, signal) => this.github.refresh(workspace, signal),
      defaultBranch: (workspace, userId) =>
        this.github.defaultBranch(workspace, userId),
      scheduleRefresh: (workspace) => this.github.scheduleFresh(workspace),
      resume: async (orgId, id, userId) => {
        await resumeWorkspace(
          workspaceRuntime(env, dependencies),
          orgId,
          id,
          userId,
        )
      },
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

  async alarm(): Promise<void> {
    if (!(await this.members.active())) return
    const fence = await this.members.readFence()
    if (
      fence &&
      !(await orgLifecycleActive(this.env.DB, fence.orgId, fence.generation))
    ) {
      await this.integration.alarms.defer(this.now(), this.now() + 30_000)
      await this.integration.alarms.set('lifecycle:access', this.now() + 30_000)
      return
    }
    await runWorkspaceAlarms(this.integration.alarms, this.now, {
      continuation: async () => {
        if (await pendingContinue(this.integration.storage))
          await this.continuation.advance()
      },
      lifecycleAllowed: async () =>
        !(await pendingContinue(this.integration.storage)) ||
        Boolean(await this.integration.storage.get('lifecycle:start-job')),
      lifecycle: () => this.alarmLifecycle(),
      github: () => this.github.alarm(),
      previews: () =>
        expireWorkspacePreviews(
          this.integration.storage,
          this.integration.alarms,
          this.features.previews,
        ),
      devices: () => this.devices.alarm(),
      publishRevocations: async () => {
        const workspaceId = await this.integration.storage.get<string>(
          'previews:workspace-id',
        )
        if (workspaceId) await this.features.publishRevocations(workspaceId)
      },
    })
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

  checkWorkspaceArchive(orgId: string, workspaceId: string, userId: string) {
    return this.archives.check(orgId, workspaceId, userId)
  }

  archiveWorkspace(
    orgId: string,
    workspaceId: string,
    userId: string,
    discard: boolean,
    origin: string,
  ) {
    return this.archives.archive(orgId, workspaceId, userId, discard, origin)
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
