import type { Workspace } from '../../src/shared/generated/Workspace'
import type { AppDependencies, AppEnv } from '../env'
import { readMergeCapabilities } from '../github/merge-capabilities'
import {
  listedGitHubRepositories,
  listedQueueEntries,
} from '../merge-queue/read'
import { freshGitHubUserToken } from '../security/github-tokens'
import type { ListedWorkspaceRow } from './shell-data'

async function viewerWriteAccess(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  userId: string,
  rows: ListedWorkspaceRow[],
) {
  const access = new Map<string, boolean>()
  const ids = [...new Set(rows.map(({ repositoryId }) => repositoryId))]
  if (!ids.length) return access
  const repositories = await listedGitHubRepositories(env.DB, orgId, ids)
  if (!repositories.length) return access
  const token = await freshGitHubUserToken(env, userId, dependencies).catch(
    () => undefined,
  )
  if (!token) return access
  await Promise.all(
    repositories.map(async (repository) => {
      const result = await readMergeCapabilities(
        dependencies.fetch,
        token,
        repository,
      ).catch(() => undefined)
      if (result) access.set(repository.id, result.canWrite)
    }),
  )
  return access
}

export async function listMergeQueueFields(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  userId: string,
  rows: ListedWorkspaceRow[],
) {
  const [entries, access] = await Promise.all([
    listedQueueEntries(env.DB, orgId),
    viewerWriteAccess(env, dependencies, orgId, userId, rows),
  ])
  return async (
    row: ListedWorkspaceRow,
  ): Promise<
    Pick<Workspace, 'mergeQueue' | 'githubCanWrite' | 'githubPullBase'>
  > => {
    const mergeQueue = entries.get(row.id)
    const githubCanWrite = access.get(row.repositoryId)
    const githubPullBase =
      row.github && row.github !== 'merged'
        ? await env.WORKSPACES?.getByName(row.id, { locationHint: 'weur' })
            .listedGitHubPullBase(row.id, row.branch)
            .catch(() => undefined)
        : undefined
    return {
      ...(mergeQueue ? { mergeQueue } : {}),
      ...(githubCanWrite === undefined ? {} : { githubCanWrite }),
      ...(githubPullBase === undefined ? {} : { githubPullBase }),
    }
  }
}
