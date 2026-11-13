import { checkRepositoryBranch } from '../github/branch-check'
import { requireGitBranchName } from '../github/branch-name'
import type { GitHubSnapshot } from '../github/contracts'
import { githubFailure } from '../github/parsers'
import { HttpError } from '../http'
import { freshGitHubUserToken } from '../security/github-tokens'
import type { ContinueJob, ContinueOptions } from './continue-types'
import { authorizeContinue } from './continue-data'

export async function continueBase(
  options: ContinueOptions,
  job: ContinueJob,
  snapshot: GitHubSnapshot,
): Promise<string> {
  const branch = snapshot.pullBaseBranch
  if (!branch) throw githubFailure()
  requireGitBranchName(branch)
  requireGitBranchName(job.defaultBranch)
  const token = await freshGitHubUserToken(
    options.env,
    job.member.id,
    options.dependencies,
  )
  await options.run(() => authorizeContinue(options, job))
  try {
    await checkRepositoryBranch(
      options.dependencies.fetch,
      token,
      {
        githubId: job.binding.repositoryId,
        fullName: job.binding.fullName,
        defaultBranch: job.defaultBranch,
      },
      branch,
    )
    await options.run(() => authorizeContinue(options, job))
    return branch
  } catch (error) {
    if (error instanceof HttpError && error.code === 'branch_not_found')
      return job.defaultBranch
    throw error
  }
}
