import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import { branchRepository } from '../github/branch-data'
import { checkRepositoryBranch } from '../github/branch-check'
import { requireGitBranchName } from '../github/branch-name'
import { HttpError } from '../http'
import { freshGitHubUserToken } from '../security/github-tokens'

export async function creationBranches(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  senderId: string,
  input: CreateWorkspaceRequest,
  defaultBranch: string,
): Promise<{ startBranch: string; baseBranch: string | undefined }> {
  const named = [
    ...new Set(
      [input.startBranch, input.baseBranch].filter(
        (name): name is string => name !== undefined,
      ),
    ),
  ]
  named.forEach(requireGitBranchName)
  const branches = named.filter((name) => name !== defaultBranch)
  if (branches.length) {
    const repository = await branchRepository(env.DB, orgId, input.repositoryId)
    try {
      const token = await freshGitHubUserToken(env, senderId, dependencies)
      for (const branch of branches)
        await checkRepositoryBranch(
          dependencies.fetch,
          token,
          repository,
          branch,
        )
    } catch (error) {
      if (
        error instanceof HttpError &&
        ['branch_not_found', 'github_access_required'].includes(error.code)
      )
        throw error
    }
  }
  const startBranch = input.startBranch ?? input.baseBranch ?? defaultBranch
  const baseBranch = input.baseBranch ?? input.startBranch ?? defaultBranch
  return {
    startBranch,
    baseBranch: baseBranch === defaultBranch ? undefined : baseBranch,
  }
}
