import { orgSettingsPaths } from '../../src/shared/org-settings'
import { repositoryBranchesPath } from '../../src/shared/workspace-branches'
import type { AppDependencies, AppEnv } from '../env'
import { installationAccessToken } from '../github/app-credentials'
import { workspaceBranchPage } from '../github/branch-picker'
import { branchRepository } from '../github/branch-repository'
import { githubFailure } from '../github/parsers'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'

export async function workspaceBranchesRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org || request.method !== 'GET') return null
  const orgId = context.org.id
  const url = new URL(request.url)
  const prefix = `${orgSettingsPaths.repositories(orgId)}/`
  if (!url.pathname.startsWith(prefix) || !url.pathname.endsWith('/branches'))
    return null
  let id: string
  try {
    id = decodeURIComponent(
      url.pathname.slice(prefix.length, -'/branches'.length),
    )
  } catch {
    throw unavailable()
  }
  if (url.pathname !== repositoryBranchesPath(orgId, id)) return null
  const read = () => branchRepository(env.DB, orgId, id, context.user.id)
  const repository = await read()
  if (!repository) throw unavailable()
  if (!env.GITHUB_APP_PRIVATE_KEY) throw githubFailure()
  const token = await installationAccessToken(
    { clientId: env.GITHUB_CLIENT_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY },
    {
      installationId: repository.installationId,
      repositoryIds: [repository.repositoryId],
      permissions: { contents: 'read', pull_requests: 'read' },
    },
    {
      fetch: dependencies.fetch,
      now: dependencies.now,
      failure: githubFailure,
    },
  )
  const response = await workspaceBranchPage(
    repository,
    {
      query: url.searchParams.get('query') ?? '',
      cursor: url.searchParams.get('cursor'),
    },
    { fetch: dependencies.fetch, token },
  )
  const current = await read()
  if (
    !current ||
    current.repositoryId !== repository.repositoryId ||
    current.installationId !== repository.installationId
  )
    throw unavailable()
  return Response.json(response)
}

function unavailable() {
  return new HttpError(
    404,
    'repository_not_found',
    'The repository is not available.',
  )
}
