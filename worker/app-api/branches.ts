import { repositoryBranchesPath } from '../../src/shared/branches'
import { orgSettingsPaths } from '../../src/shared/org-settings'
import type { AppDependencies, AppEnv } from '../env'
import { requireActiveOrg } from '../data/user-access'
import { branchRepository } from '../github/branch-data'
import { readRepositoryBranches } from '../github/branches'
import { githubFailure } from '../github/parsers'
import { HttpError } from '../http'
import { requireOrgMember } from '../lifecycle/access'
import { freshGitHubUserToken } from '../security/github-tokens'
import type { RequestContext } from '../security/gate'

export async function branchesRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org || request.method !== 'GET') return null
  const orgId = context.org.id
  const url = new URL(request.url)
  const path = url.pathname
  const root = `${orgSettingsPaths.repositories(orgId)}/`
  if (!path.startsWith(root)) return null
  let id: string
  try {
    id = decodeURIComponent(path.slice(root.length).split('/')[0])
  } catch {
    throw new HttpError(
      404,
      'repository_not_found',
      'The repository is not available.',
    )
  }
  if (path !== repositoryBranchesPath(orgId, id)) return null
  const access = async () => {
    await requireActiveOrg(env.DB, orgId)
    await requireOrgMember(env.DB, orgId, context.user.id)
    return branchRepository(env.DB, orgId, id)
  }
  const repository = await access()
  let token: string
  try {
    token = await freshGitHubUserToken(env, context.user.id, dependencies)
  } catch {
    throw githubFailure()
  }
  const response = await readRepositoryBranches(
    dependencies.fetch,
    token,
    repository,
  )
  const current = await access()
  if (
    current.githubId !== repository.githubId ||
    current.fullName !== repository.fullName
  )
    throw githubFailure()
  return Response.json(response)
}
