import type { createWorkspaceIntegration } from '../chat/workspace-integration'
import type { AppDependencies, AppEnv } from '../env'
import type { WorkspaceGitHub } from '../features/github'
import { assertReceiverActive } from '../members/receiver-fence'
import type { WorkspaceContinue } from './continue'
import { continueBusy } from './continue-admission'
import { createWorkspaceContinue } from './continue-composition'
import { pendingContinue } from './continue-types'
import { WorkspaceRepositoryChange } from './repository-change'
import {
  pendingRepositoryChange,
  repositoryChangeBusy,
  type RepositoryChangeOptions,
} from './repository-change-types'
import { workspaceRuntime } from './runtime'
import { resumeWorkspace } from './workspace-resume'

type Integration = Pick<
  ReturnType<typeof createWorkspaceIntegration>,
  'storage' | 'chat' | 'controller' | 'alarms'
>

/**
 * The two jobs that move a workspace to a new branch: Continue and a
 * repository change. Each one is the reservation of the workspace, and
 * the two exclude each other.
 */
export class WorkspaceJobs {
  readonly continuation: WorkspaceContinue
  readonly repositoryChange: WorkspaceRepositoryChange
  private readonly storage: Integration['storage']

  constructor(input: {
    env: AppEnv
    dependencies: AppDependencies
    integration: Integration
    github: Pick<
      WorkspaceGitHub,
      | 'refresh'
      | 'defaultBranch'
      | 'memberDefaultBranch'
      | 'scheduleFresh'
      | 'branchWork'
    >
    matches(workspaceId: string): boolean
    run: RepositoryChangeOptions['run']
  }) {
    this.storage = input.integration.storage
    this.continuation = createWorkspaceContinue(input)
    this.repositoryChange = new WorkspaceRepositoryChange(
      repositoryChangeOptions(input),
    )
  }

  /** Archive and Restart wait for a running job. */
  async assertIdle(): Promise<void> {
    if (await pendingContinue(this.storage)) throw continueBusy()
    if (await pendingRepositoryChange(this.storage))
      throw repositoryChangeBusy()
  }

  async credentialSender(turnId: string): Promise<string | null | undefined> {
    const continued = await this.continuation.credentialSender(turnId)
    return continued === undefined
      ? this.repositoryChange.credentialSender(turnId)
      : continued
  }

  async cancel(): Promise<void> {
    await this.continuation.cancel()
    await this.repositoryChange.cancel()
  }
}

function repositoryChangeOptions(
  input: ConstructorParameters<typeof WorkspaceJobs>[0],
): RepositoryChangeOptions {
  const { env, dependencies, integration, github } = input
  return {
    matches: input.matches,
    assertActive: () => assertReceiverActive(integration.storage),
    activity: async () => {
      await integration.controller.lifecycleActivity()
    },
    env,
    dependencies,
    storage: integration.storage,
    chat: integration.chat,
    run: input.run,
    schedule: (at) => integration.alarms.set('repository-change', at),
    defaultBranch: (current, target, userId) =>
      github.defaultBranch(current, userId, target),
    oldBranchWork: (binding, userId) => github.branchWork(binding, userId),
    scheduleRefresh: (binding) => github.scheduleFresh(binding),
    resume: async (orgId, id, userId) => {
      await resumeWorkspace(
        workspaceRuntime(env, dependencies),
        orgId,
        id,
        userId,
      )
    },
    lifecycle: async () =>
      (await integration.controller.readLifecycle()) ?? null,
    runner: async () => {
      const active = integration.chat.runner.connections.current
      return active && active.state.protocolVersion !== null
        ? {
            state: 'hello',
            canMove: active.state.repositoryFolder !== undefined,
          }
        : { state: 'none' }
    },
    moveRunner: () => integration.chat.runner.checkRepository(),
  }
}
