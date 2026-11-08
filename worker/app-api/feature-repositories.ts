import type { GitHubRepository } from '../../src/shared/account'
import type { Repository } from '../../src/shared/org-settings'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import {
  assertCanChangeSharedSettings,
  requireOrgMember,
} from '../members/permissions'
import { readGitHubConnection } from '../security/github-connection-store'
import { shellGitHubAccess } from './feature-github'
import {
  saveShellRepository,
  shellRepositoryId,
} from './feature-repositories-data'
import { shellRepositories } from './shell-data'

function mergeRepositories(
  orgId: string,
  stored: readonly Repository[],
  available: readonly GitHubRepository[],
): Repository[] {
  const result = new Map<number, Repository>(
    stored.map((repository) => [repository.githubId, repository]),
  )
  for (const repository of available) {
    const previous = result.get(repository.githubId)
    result.set(repository.githubId, {
      ...repository,
      orgId,
      id: previous?.id ?? shellRepositoryId(orgId, repository.githubId),
      selected: previous?.selected ?? false,
    })
  }
  return [...result.values()].sort(
    (a, b) => a.fullName.localeCompare(b.fullName) || a.id.localeCompare(b.id),
  )
}

export async function shellRepositoryChoices(
  env: AppEnv,
  orgId: string,
  userId: string,
  dependencies: AppDependencies,
): Promise<Repository[]> {
  await requireOrgMember(env.DB, orgId, userId)
  const stored = await shellRepositories(env.DB, orgId)
  if (!(await readGitHubConnection(env.DB, userId))) return stored
  const access = await shellGitHubAccess(env, userId, dependencies)
  return mergeRepositories(orgId, stored, access.repositories)
}

export async function changeShellRepository(
  env: AppEnv,
  orgId: string,
  userId: string,
  repositoryId: string,
  selected: boolean,
  dependencies: AppDependencies,
): Promise<Response> {
  await assertCanChangeSharedSettings(env.DB, orgId, userId)
  const stored = await shellRepositories(env.DB, orgId)
  let repository = stored.find((entry) => entry.id === repositoryId)
  if (selected) {
    const access = await shellGitHubAccess(env, userId, dependencies)
    const available = access.repositories.find((entry) =>
      repository
        ? entry.githubId === repository.githubId
        : shellRepositoryId(orgId, entry.githubId) === repositoryId,
    )
    if (!available) throw repositoryNotFound()
    repository = {
      ...available,
      orgId,
      id: repository?.id ?? shellRepositoryId(orgId, available.githubId),
      selected,
    }
  }
  if (!repository) throw repositoryNotFound()
  if (
    !(await saveShellRepository(env.DB, {
      repository,
      userId,
      selected,
      now: dependencies.now(),
    }))
  ) {
    await assertCanChangeSharedSettings(env.DB, orgId, userId)
    throw repositoryNotFound()
  }
  return Response.json({
    repositories: await shellRepositoryChoices(
      env,
      orgId,
      userId,
      dependencies,
    ),
  })
}

function repositoryNotFound(): HttpError {
  return new HttpError(
    404,
    'repository_not_found',
    'The repository is not available.',
  )
}
