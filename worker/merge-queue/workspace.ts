import { featureResult } from '../features/result'
import type { GitHubSnapshot, GitHubWorkspace } from '../github/contracts'
import { GITHUB_STATE_KEY } from '../github/workspace-state'
import { lifecycleDependencies } from '../lifecycle/runtime'
import { pendingWorkspaceChange } from '../lifecycle/repository-change-types'
import { saveQueueBaseChange } from '../lifecycle/queue-base-change'
import { syncQueueHead } from '../lifecycle/queue-head-sync'
import { AgentSessionWorkspace } from '../tools/workspace'
import { QueueCoordinator } from './coordinator'
import type { QueueLeave, QueueMemberAction, QueueScope } from './contracts'
import { queueFixSender } from './fix-access'
import type {
  QueueFixAdmission,
  QueueFixEnd,
  QueueFixRequest,
  QueueRestack,
} from './fix-contracts'
import { queueLocalClean, type QueueLocalWork } from './local-work'

export class MergeQueueWorkspace extends AgentSessionWorkspace {
  private readonly mergeQueue: QueueCoordinator

  constructor(...args: ConstructorParameters<typeof AgentSessionWorkspace>) {
    super(...args)
    this.mergeQueue = new QueueCoordinator(
      {
        env: this.env,
        dependencies: { ...lifecycleDependencies(), now: args[2] ?? Date.now },
      },
      this.ctx,
    )
  }

  changeMergeQueue(
    scope: QueueScope,
    workspaceId: string,
    memberId: string,
    action: QueueMemberAction,
  ) {
    return featureResult(() =>
      this.mergeQueue.change(scope, workspaceId, memberId, action),
    )
  }

  wakeMergeQueue(scope: QueueScope, signal?: QueueLeave) {
    return featureResult(() => this.mergeQueue.wake(scope, signal))
  }

  requestMergeQueueFix(
    scope: QueueScope,
    workspaceId: string,
    restack: QueueRestack,
  ) {
    return featureResult(() =>
      this.mergeQueue.requestFix(scope, workspaceId, restack),
    )
  }

  writeMergeQueueFix(fix: QueueFixRequest) {
    return featureResult(() => {
      const operation = this.chat.operation(fix.entry.workspaceId)
      return this.run(async (): Promise<QueueFixAdmission> => {
        if (await pendingWorkspaceChange(this.integration.storage))
          return { kind: 'deferred' }
        return operation.acceptQueueFix(fix, () =>
          queueFixSender(this.env.DB, fix),
        )
      })
    })
  }

  reportMergeQueueFix(scope: QueueScope, result: QueueFixEnd) {
    return featureResult(() => this.mergeQueue.reportFix(scope, result))
  }

  saveMergeQueueBase(binding: GitHubWorkspace, to: string | null) {
    return featureResult(async () => {
      if (!this.env.WORKSPACES.idFromName(binding.id).equals(this.ctx.id))
        return false
      return saveQueueBaseChange(
        this.env.DB,
        this.integration.storage,
        binding,
        to,
        this.integration.now(),
      )
    })
  }

  syncMergeQueueHead(
    binding: GitHubWorkspace,
    head: { oldHead: string; newHead: string },
  ) {
    return featureResult(async () => {
      if (!this.env.WORKSPACES.idFromName(binding.id).equals(this.ctx.id))
        return 'retry' as const
      const { baseChanges, storage, now } = this.integration
      const chat = this.chat.operation(binding.id)
      return syncQueueHead(
        {
          env: this.env,
          dependencies: { ...lifecycleDependencies(), now },
          storage,
          fetches: baseChanges.fetches,
        },
        binding,
        head,
        (operation) =>
          this.run(async () => {
            if (await pendingWorkspaceChange(storage)) return 'retry'
            const active = await chat.read(async (view) =>
              (await view.sessions()).some(
                ({ activeTurnId }) => activeTurnId !== null,
              ),
            )
            return active ? 'active-turn' : operation()
          }),
      )
    })
  }

  async mergeQueueLocalClean(input: QueueLocalWork): Promise<boolean> {
    if (!this.env.WORKSPACES.idFromName(input.workspaceId).equals(this.ctx.id))
      return false
    if (await pendingWorkspaceChange(this.integration.storage)) return false
    return queueLocalClean(
      {
        env: this.env,
        dependencies: { ...lifecycleDependencies(), now: this.integration.now },
      },
      this.integration.files,
      input,
    )
  }

  protected async alarmWithQueue(fallback: () => Promise<void>): Promise<void> {
    if (!(await this.mergeQueue.alarm())) await fallback()
  }

  async listedGitHubPullBase(
    workspaceId: string,
    branch: string,
  ): Promise<string | undefined> {
    if (!this.env.WORKSPACES.idFromName(workspaceId).equals(this.ctx.id))
      return undefined
    const snapshot = await this.chat.readWorkspace(workspaceId, (view) =>
      view.github.get<GitHubSnapshot>(GITHUB_STATE_KEY),
    )
    const banner = snapshot?.banner
    return banner?.branch === branch &&
      banner.pullRequest &&
      banner.state !== 'closed' &&
      banner.state !== 'merged'
      ? snapshot?.pullBaseBranch
      : undefined
  }
}
