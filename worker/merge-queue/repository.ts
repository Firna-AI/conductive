import { GitHubReader } from '../github/client'
import type { GitHubWorkspace } from '../github/contracts'
import { installationTokenProvider } from '../github/credentials'
import { githubFailure } from '../github/parsers'
import type { QueueMergeTarget, QueueRecord } from './contracts'
import type { QueueRuntime } from './step'

export function queueWorkspace(
  queue: QueueRecord,
  entry: QueueMergeTarget,
): GitHubWorkspace {
  return {
    id: entry.workspaceId,
    orgId: queue.orgId,
    repositoryId: queue.githubRepositoryId,
    installationId: queue.installationId,
    fullName: queue.fullName,
    defaultBranch: queue.trunk,
    branch: entry.branch,
  }
}

export function queueReader(
  { dependencies }: QueueRuntime,
  workspace: GitHubWorkspace,
  token: string,
) {
  return new GitHubReader(
    { ...dependencies, token: async () => token },
    workspace,
    token,
  )
}

export function queueReadToken(
  { env, dependencies }: QueueRuntime,
  workspace: GitHubWorkspace,
): Promise<string> {
  if (!env.GITHUB_APP_PRIVATE_KEY || workspace.installationId == null)
    throw githubFailure()
  return installationTokenProvider(
    { ...env, GITHUB_APP_PRIVATE_KEY: env.GITHUB_APP_PRIVATE_KEY },
    dependencies.fetch,
    dependencies.now,
  )(workspace)
}
