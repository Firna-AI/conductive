import { featureResult } from '../features/result'
import type { GitHubSnapshot } from '../github/contracts'
import { GITHUB_STATE_KEY } from '../github/workspace-state'
import { lifecycleDependencies } from '../lifecycle/runtime'
import { AgentSessionWorkspace } from '../tools/workspace'
import { QueueCoordinator } from './coordinator'
import type { QueueLeave, QueueMemberAction, QueueScope } from './contracts'

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
