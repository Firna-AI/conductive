import type { GitHubRepository } from '../../src/shared/account'
import type {
  Repository,
  RepositoryOrderResponse,
} from '../../src/shared/org-settings'
import {
  chosenRepositoryIds,
  compareInRepositoryOrder,
} from '../data/repository-order'
import { latestSoftwareRelease } from '../lifecycle/software-release'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { startImageBuild } from '../lifecycle/image-builds'
import { currentImageRepositoryReadiness } from '../lifecycle/published-image-data'
import { imageRuntime } from '../lifecycle/runtime'
import {
  assertCanChangeSharedSettings,
  requireOrgMember,
} from '../members/permissions'
import { readGitHubConnection } from '../security/github-connection-store'
import type { RequestContext } from '../security/gate'
import { warnWorker } from '../warnings'
import { shellGitHubAccess } from './feature-github'
import {
  moveShellRepository,
  saveShellRepository,
  shellRepositoryId,
} from './feature-repositories-data'
import {
  invalidShellInput,
  optionalShellPosition,
} from './feature-shell-access'
import { shellRepositories } from './shell-data'
import { workspaceBinding } from './workspace-state'

/**
 * The stored repositories with the ones that the person reaches on GitHub:
 * the chosen ones first, in the repository order, then the others in the
 * name order.
 */
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
  const chosenIds = stored
    .filter((repository) => repository.selected)
    .map((repository) => repository.id)
  return [...result.values()].sort(compareInRepositoryOrder(chosenIds))
}

async function withRepositoryReadiness(
  db: D1Database,
  orgId: string,
  repositories: readonly Repository[],
): Promise<Repository[]> {
  const { imageReady, repositoryIds } = await currentImageRepositoryReadiness(
    db,
    orgId,
  )
  return repositories.map((repository) => ({
    ...repository,
    ready: repositoryIds.has(repository.id),
    imageReady,
  }))
}

export async function shellRepositoryChoices(
  env: AppEnv,
  orgId: string,
  userId: string,
  dependencies: AppDependencies,
): Promise<Repository[]> {
  await requireOrgMember(env.DB, orgId, userId)
  const stored = await shellRepositories(env.DB, orgId)
  if (!(await readGitHubConnection(env.DB, userId)))
    return withRepositoryReadiness(env.DB, orgId, stored)
  const access = await shellGitHubAccess(env, userId, dependencies)
  return withRepositoryReadiness(
    env.DB,
    orgId,
    mergeRepositories(orgId, stored, access.repositories),
  )
}

/**
 * Adds or removes one repository of the org. An add starts a build unless
 * `build` is false: the app then starts one build at Done, after all the
 * adds of one edit. A request without `build`, from an older app, still
 * starts a build at each add. The reply merges fresh stored rows with the
 * GitHub catalogue read before the save, so a later GitHub failure cannot
 * fail a saved change.
 */
export async function changeShellRepository(
  env: AppEnv,
  orgId: string,
  userId: string,
  repositoryId: string,
  change: { selected: boolean; build: boolean },
  dependencies: AppDependencies,
): Promise<Response> {
  const { selected } = change
  await assertCanChangeSharedSettings(env.DB, orgId, userId)
  const stored = await shellRepositories(env.DB, orgId)
  let repository = stored.find((entry) => entry.id === repositoryId)
  if (!selected && !repository) throw repositoryNotFound()
  const availableRepositories =
    selected || (await readGitHubConnection(env.DB, userId))
      ? (await shellGitHubAccess(env, userId, dependencies)).repositories
      : []
  if (selected) {
    const available = availableRepositories.find((entry) =>
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
  const saved = await saveShellRepository(env.DB, {
    repository,
    userId,
    selected,
    now: dependencies.now(),
  })
  if (!saved.saved) {
    await assertCanChangeSharedSettings(env.DB, orgId, userId)
    throw repositoryNotFound()
  }
  if (saved.added && change.build) {
    try {
      await startImageBuild(
        imageRuntime(
          { ...env, WORKSPACES: workspaceBinding(env) },
          dependencies,
        ),
        {
          orgId,
          userId,
          kind: 'build',
          software: await latestSoftwareRelease(env, dependencies.fetch),
        },
      )
    } catch {
      warnWorker({ kind: 'repository_image_build_start_failed' })
    }
  }
  await requireOrgMember(env.DB, orgId, userId)
  const repositories = mergeRepositories(
    orgId,
    await shellRepositories(env.DB, orgId),
    availableRepositories,
  )
  return Response.json({
    repositories: await withRepositoryReadiness(env.DB, orgId, repositories),
  })
}

/**
 * Moves one chosen repository to `index` of the repository order, as an
 * admin. The index counts the chosen repositories without the moved one.
 * A repository that is not chosen moves nothing. A move starts no build and
 * keeps the settings revision, because the image does not depend on the
 * order. The reply is the saved repository order, from stored data only,
 * so that no call to GitHub can fail a move that saved.
 */
export async function moveShellRepositoryRoute(
  env: AppEnv,
  orgId: string,
  userId: string,
  repositoryId: string,
  body: RequestContext['body'],
): Promise<Response> {
  const index = optionalShellPosition(body?.index)
  if (index === undefined) throw invalidShellInput()
  await assertCanChangeSharedSettings(env.DB, orgId, userId)
  const moved = await moveShellRepository(env.DB, {
    orgId,
    userId,
    repositoryId,
    index,
  })
  if (!moved) await assertCanChangeSharedSettings(env.DB, orgId, userId)
  return Response.json({
    order: await chosenRepositoryIds(env.DB, orgId),
  } satisfies RepositoryOrderResponse)
}

function repositoryNotFound(): HttpError {
  return new HttpError(
    404,
    'repository_not_found',
    'The repository is not available.',
  )
}
