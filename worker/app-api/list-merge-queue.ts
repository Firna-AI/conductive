import type { Workspace } from '../../src/shared/generated/Workspace'
import type { WorkspaceListRepository } from '../../src/shared/generated/WorkspaceListRepository'
import type { AppDependencies, AppEnv } from '../env'
import { readMergeCapabilities } from '../github/merge-capabilities'
import { listQueuePulls, trunkRequiresMergeQueue } from '../github/queue-pulls'
import {
  listedGitHubRepositories,
  listedQueueEntries,
} from '../merge-queue/read'
import { freshGitHubUserToken } from '../security/github-tokens'
import type { ListedWorkspaceRow } from './shell-data'

type RepositoryRow = Awaited<
  ReturnType<typeof listedGitHubRepositories>
>[number]

async function githubListFacts(
  dependencies: AppDependencies,
  token: string,
  repository: RepositoryRow,
  branches: readonly string[],
) {
  const { fetch } = dependencies
  const access = await readMergeCapabilities(fetch, token, repository).catch(
    () => undefined,
  )
  if (!access?.canWrite || !branches.length) return { access }
  const [pulls, githubQueueRequired] = await Promise.all([
    listQueuePulls(fetch, token, repository, branches).catch(() => undefined),
    trunkRequiresMergeQueue(
      fetch,
      token,
      repository.fullName,
      repository.defaultBranch,
    ).catch(() => undefined),
  ])
  return { access, pulls, githubQueueRequired }
}

export async function listMergeQueueFields(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  userId: string,
  rows: ListedWorkspaceRow[],
) {
  const [entries, catalogue] = await Promise.all([
    listedQueueEntries(env.DB, orgId),
    listedGitHubRepositories(env.DB, orgId),
  ])
  const branches = new Map<string, Set<string>>()
  for (const row of rows) {
    if (row.archivedAt !== null || row.state === 'archived') continue
    const heads = branches.get(row.repositoryId) ?? new Set<string>()
    heads.add(row.branch)
    branches.set(row.repositoryId, heads)
  }
  const token = branches.size
    ? await freshGitHubUserToken(env, userId, dependencies).catch(
        () => undefined,
      )
    : undefined
  const facts = new Map(
    await Promise.all(
      catalogue.map(
        async (repository) =>
          [
            repository.id,
            token &&
            repository.installationId !== null &&
            branches.has(repository.id)
              ? await githubListFacts(dependencies, token, repository, [
                  ...(branches.get(repository.id) ?? []),
                ])
              : undefined,
          ] as const,
      ),
    ),
  )
  const repositories: WorkspaceListRepository[] = catalogue.map(
    (repository) => {
      const githubQueueRequired = facts.get(repository.id)?.githubQueueRequired
      return {
        id: repository.id,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        selected: repository.selected === 1,
        queueInUse: repository.queueInUse === 1,
        ...(githubQueueRequired === undefined ? {} : { githubQueueRequired }),
      }
    },
  )
  return {
    repositories,
    async fields(
      row: ListedWorkspaceRow,
    ): Promise<
      Pick<
        Workspace,
        | 'mergeQueue'
        | 'githubCanWrite'
        | 'githubPullBase'
        | 'githubPullFromFork'
      >
    > {
      const mergeQueue = entries.get(row.id)
      const repository = facts.get(row.repositoryId)
      const githubCanWrite = repository?.access?.canWrite
      const pull = repository?.pulls?.get(row.branch)
      let githubPullBase = pull?.kind === 'open' ? pull.pull.base : undefined
      if (!pull && row.github && row.github !== 'merged')
        githubPullBase = await env.WORKSPACES?.getByName(row.id, {
          locationHint: 'weur',
        })
          .listedGitHubPullBase(row.id, row.branch)
          .catch(() => undefined)
      return {
        ...(mergeQueue ? { mergeQueue } : {}),
        ...(githubCanWrite === undefined ? {} : { githubCanWrite }),
        ...(githubPullBase === undefined ? {} : { githubPullBase }),
        ...(pull?.kind === 'fork' && { githubPullFromFork: true }),
      }
    },
  }
}
