import type { AppDependencies, AppEnv } from '../env'
import type { GitHubWorkspace } from '../github/contracts'
import { githubFailure } from '../github/parsers'
import { providerForAccount } from '../sandbox/client'
import { repositoryLocation } from './repository-locations'
import { workspaceRepositoryLocations } from './repository-location-data'
import { workspaceBaseCommand } from './workspace-base-command'
import { readWorkspace } from './workspace-data'

export async function syncWorkspaceBase(
  env: AppEnv,
  dependencies: AppDependencies,
  binding: GitHubWorkspace,
): Promise<void> {
  const row = await readWorkspace(env.DB, binding.orgId, binding.id)
  if (row.branch !== binding.branch || row.baseBranch !== binding.defaultBranch)
    throw githubFailure()
  if (
    !row.sandboxId ||
    row.archivedAt !== null ||
    !['ready', 'unread', 'working', 'input', 'starting'].includes(row.state)
  )
    return
  const directory = repositoryLocation(
    await workspaceRepositoryLocations(env.DB, row.id),
    row.repositoryId,
  )
  const provider = providerForAccount(
    env,
    dependencies.fetch,
    row.providerAccount,
  )
  const current = await readWorkspace(env.DB, binding.orgId, binding.id)
  if (
    current.sandboxId !== row.sandboxId ||
    current.providerAccount !== row.providerAccount ||
    current.branch !== row.branch ||
    current.baseBranch !== row.baseBranch
  )
    throw githubFailure()
  const result = await provider.runCommand(
    row.sandboxId,
    workspaceBaseCommand({
      directory,
      branch: row.branch,
      baseBranch: binding.defaultBranch,
    }),
  )
  if (result.exitCode !== 0 || result.timedOut) throw githubFailure()
}
