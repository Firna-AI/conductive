import type { GitHubRepository } from '../../src/shared/account'
import type { OrgSummary } from '../../src/shared/orgs'
import { requireActiveUser, suspendedUserError } from '../data/user-access'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError, requiredString } from '../http'
import type { RequestContext } from '../security/gate'
import { shellGitHubAccess } from './feature-github'
import { insertShellOrg } from './feature-org-data'
import { invalidShellInput, optionalShellString } from './feature-shell-access'

export async function createShellOrg(
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response> {
  const name = requiredString(context.body?.name)
  const initials = optionalShellString(context.body?.initials)
  const ids: unknown = context.body?.repositoryIds ?? []
  if (!Array.isArray(ids)) throw invalidShellInput()
  const repositoryIds = new Set<number>()
  for (const value of ids) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value))
      throw invalidShellInput()
    repositoryIds.add(value)
  }
  await requireActiveUser(env.DB, context.user.id)
  const repositories: GitHubRepository[] = []
  if (repositoryIds.size) {
    const access = await shellGitHubAccess(env, context.user.id, dependencies)
    for (const id of repositoryIds) {
      const repository = access.repositories.find(
        (entry) => entry.githubId === id,
      )
      if (!repository)
        throw new HttpError(
          404,
          'repository_not_found',
          'The repository is not available.',
        )
      repositories.push(repository)
    }
  }
  const id = dependencies.randomToken()
  if (
    !(await insertShellOrg(env.DB, {
      id,
      name,
      initials,
      userId: context.user.id,
      repositories,
      now: dependencies.now(),
    }))
  ) {
    throw suspendedUserError()
  }
  const org: OrgSummary = { id, name, role: 'admin' }
  if (initials !== undefined) org.initials = initials
  return Response.json({ org }, { status: 201 })
}
