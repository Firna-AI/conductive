import {
  readChatWorkspaceResponse,
  type WorkspaceReadRequest,
} from './chat/workspace-response'
import type { WorkspaceCompositionEnv } from './chat/workspace-integration'
import type { WorkspaceChatResolvers } from './chat/workspace-resolvers'
import { MergeQueueWorkspace } from './merge-queue/workspace'
import { lifecycleDependencies } from './lifecycle/runtime'
import type { ToolPreviewCall } from './tools/services'
import { WorkspaceFeatures } from './features/workspace'
import { WorkspaceGitHub } from './features/github'
import {
  WorkspaceMembersReceiver,
  type ReceiverOwnership,
} from './members/workspace-receiver'
import type { WorkspaceDisk } from './members/maintenance-contract'
import type { ImageCoordinatorState } from './lifecycle/image-timers'
import type { GitHubRefresh, GitHubWorkspace } from './github/contracts'
import { hostSurface } from './hosts'
import { workspaceUpdate } from './chat/workspace-update'
import { featureResult } from './features/result'
import { archiveWorkspace } from './lifecycle/archive-workspace'
import type { WorkspaceContinue } from './lifecycle/continue'
import type { WorkspaceRepositoryChange } from './lifecycle/repository-change'
import { WorkspaceJobs } from './lifecycle/workspace-jobs'
import { changeRestart, type RestartStep } from './lifecycle/software-restart'
import { createAutomaticRestart } from './lifecycle/automatic-restart'
import { resumeCreationCheckpoint } from './members/creation-checkpoint'
import type { ConnectionScheduler } from './security/connection-access'
import { WorkspaceAlarmRunner } from './features/workspace-alarm'

export class Workspace extends MergeQueueWorkspace {
  private readonly features: WorkspaceFeatures
  private readonly github: WorkspaceGitHub
  private readonly members: WorkspaceMembersReceiver
  private readonly jobs: WorkspaceJobs
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
      (id, ids, queueOwned) =>
        queueOwned
          ? this.chat.commitPreviewRevocations(id, ids)
          : this.chat.runLifecycle(() =>
              this.chat.commitPreviewRevocations(id, ids),
            ),
      this.chat,
    )
    this.integration.onStopped((id) => this.features.revokeWorkspace(id, true))
    this.integration.onStopped(this.chat.runner.services.stoppedHook)
    this.github = new WorkspaceGitHub(
      this.integration.storage,
      env,
      dependencies,
      this.chat,
      matches,
      this.integration.alarms,
      this.integration.baseChanges,
    )
    this.members = new WorkspaceMembersReceiver(
      context.storage,
      this.chat,
      this.features,
      now,
    )
    this.jobs = new WorkspaceJobs({
      matches,
      env,
      dependencies,
      integration: this.integration,
      github: this.github,
      run: (operation) => this.run(operation),
    })
    const restart = createAutomaticRestart({
      ...this.integration,
      env,
      dependencies,
      run: (work) => this.run(work),
      refreshTerminal: (target) => this.features.refreshTerminal(target),
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
      secrets: this.integration.secrets,
      members: this.members,
      github: this.github,
      jobs: this.jobs,
      features: this.features,
      lifecycle: (dispatch) =>
        this.alarmLifecycle(dispatch && (() => restart(dispatch))),
      chatStore: this.chat.store,
      sessionWatches: () => this.sessionWatches.alarm(),
    })
  }

  agentPreviewCall(input: ToolPreviewCall, origin: string) {
    return featureResult(() => this.features.agentPreviews(input, origin))
  }

  refreshGitHub(workspace: GitHubWorkspace, signal: GitHubRefresh) {
    return featureResult(() => this.github.refresh(workspace, signal))
  }

  suspendMemberLifecycle(
    ownership: ReceiverOwnership,
    workspaceId: string | null,
  ) {
    return featureResult(async () => {
      await this.jobs.cancel()
      await this.members.suspend(ownership, workspaceId)
      await this.integration.secrets.reconcile()
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

  readChatWorkspaceResponse(...request: WorkspaceReadRequest) {
    return this.chat.runLifecycle((turn) =>
      readChatWorkspaceResponse(
        this.env,
        this.chat.store,
        turn,
        request,
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
      await this.chat.commitWorkspaceEvent(
        workspaceId,
        await workspaceUpdate(this.env.DB, orgId, workspaceId),
      )
    })
  }

  alarm(): Promise<void> {
    return this.alarmWithQueue(() => this.alarmRunner.alarm())
  }

  protected settledAlarms(): Promise<void> {
    return this.alarmRunner.settled()
  }

  async fetch(request: Request): Promise<Response> {
    if (hostSurface(request, this.env) === 'preview')
      return this.features.previews.proxy(request)
    const feature = await this.features.fetch(request)
    if (feature) return feature
    const github = await this.github.route(request)
    if (github) return github
    return this.fetchChat(request)
  }

  archiveWorkspace(
    orgId: string,
    workspaceId: string,
    userId: string,
    origin: string,
  ) {
    return featureResult(() =>
      this.run(async (turn) => {
        await this.jobs.assertIdle()
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
            outside: turn.outside,
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

  softwareRestart(workspaceId: string, step: RestartStep) {
    return featureResult(() =>
      typeof step === 'string'
        ? this.run(() =>
            changeRestart(this.integration, workspaceId, step, this.now()),
          )
        : this.features.refreshTerminal(step.terminal),
    )
  }

  continueWorkspace(...input: Parameters<WorkspaceContinue['start']>) {
    return featureResult(() => this.jobs.continuation.start(...input))
  }

  readWorkspaceContinue(...input: Parameters<WorkspaceContinue['result']>) {
    return featureResult(() => this.jobs.continuation.result(...input))
  }

  changeWorkspaceRepository(
    ...input: Parameters<WorkspaceRepositoryChange['start']>
  ) {
    return featureResult(() => this.jobs.repositoryChange.start(...input))
  }

  readWorkspaceRepositoryChange(
    ...input: Parameters<WorkspaceRepositoryChange['result']>
  ) {
    return featureResult(() => this.jobs.repositoryChange.result(...input))
  }

  async credentialSender(turnId: string): Promise<string | null> {
    const sender = await this.jobs.credentialSender(turnId)
    return sender === undefined ? super.credentialSender(turnId) : sender
  }

  async lifecycleStopped(): Promise<void> {
    await this.jobs.cancel()
    return super.lifecycleStopped()
  }
}
