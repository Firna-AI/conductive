import type { Workspace } from '../../src/shared/generated/Workspace'
import type { WorkspaceListRepository } from '../../src/shared/generated/WorkspaceListRepository'
import type { AppDependencies, AppEnv } from '../env'
import { outputBranchLabels } from '../github/output'
import { environmentSecrets } from '../lifecycle/org-environment'
import { workspaceEnvironmentSettings } from '../lifecycle/settings-data'
import {
  listedGitHubRepositories,
  listedQueueEntries,
  listedRemovalPlans,
} from '../merge-queue/read'
import { cachedQueueListFacts } from './list-queue-refresh'
import type { ListedWorkspaceRow } from './shell-data'

function listsBranches(rows: readonly ListedWorkspaceRow[]) {
  const branches = new Map<string, Set<string>>()
  for (const row of rows) {
    if (row.archivedAt !== null || row.state === 'archived') continue
    const heads = branches.get(row.repositoryId) ?? new Set<string>()
    heads.add(row.branch)
    branches.set(row.repositoryId, heads)
  }
  return branches
}

export async function listMergeQueueFields(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  userId: string,
  rows: ListedWorkspaceRow[],
) {
  const [entries, plans, catalogue] = await Promise.all([
    listedQueueEntries(env.DB, orgId),
    listedRemovalPlans(env.DB, orgId),
    listedGitHubRepositories(env.DB, orgId),
  ])
  const { facts, refresh } = await cachedQueueListFacts(
    env,
    dependencies,
    orgId,
    userId,
    catalogue,
    listsBranches(rows),
  )
  const byId = new Map(
    catalogue.map((repository) => [repository.id, repository]),
  )
  const repositories: WorkspaceListRepository[] = catalogue.map(
    (repository) => {
      const githubQueueRequired = facts.get(repository.id)?.repository
        ?.githubQueueRequired
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
  // Only the raw facts are saved. Each read uses the environment of this start.
  const filters = new Map<
    string | null,
    Promise<ReturnType<typeof outputBranchLabels> | undefined>
  >()
  const filter = (capture: string | null) => {
    const existing = filters.get(capture)
    if (existing) return existing
    const loaded = workspaceEnvironmentSettings(env, orgId, capture)
      .then((settings) => outputBranchLabels(environmentSecrets(settings)))
      .catch(() => undefined)
    filters.set(capture, loaded)
    return loaded
  }
  return {
    repositories,
    refresh,
    async fields(
      row: ListedWorkspaceRow,
    ): Promise<
      Pick<
        Workspace,
        | 'mergeQueue'
        | 'mergeQueueLabels'
        | 'githubCanWrite'
        | 'githubPullBase'
        | 'githubPullFromFork'
      >
    > {
      if (row.archivedAt !== null || row.state === 'archived') return {}
      const entry = entries.get(row.id)
      const plan = plans.get(row.id)
      const repository = byId.get(row.repositoryId)
      const fact = facts.get(row.repositoryId)
      const pull = fact?.repository?.pulls.get(row.branch)
      const labels = await filter(row.environmentCiphertext)
      const removal = plan &&
        labels && { base: labels.branch(plan.base), above: plan.above }
      return {
        ...(entry && { mergeQueue: { ...entry, ...(removal && { removal }) } }),
        ...(repository &&
          labels && {
            mergeQueueLabels: {
              defaultBranch: labels.branch(repository.defaultBranch),
              ...(pull?.base && { pullBase: labels.branch(pull.base) }),
            },
          }),
        ...(fact?.canWrite !== undefined && { githubCanWrite: fact.canWrite }),
        ...(pull?.base && { githubPullBase: pull.base }),
        ...(pull?.fork && { githubPullFromFork: true }),
      }
    },
  }
}
