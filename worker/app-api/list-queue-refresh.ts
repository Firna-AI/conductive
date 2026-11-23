import type { AppDependencies, AppEnv } from '../env'
import { readQueueWriteAccess } from '../github/merge-capabilities'
import { listQueuePulls, trunkRequiresMergeQueue } from '../github/queue-pulls'
import { isRecord } from '../http'
import {
  claimListFacts,
  finishListFacts,
  LIST_FACTS_FRESH_MS,
  readListFacts,
  type ListFactsKey,
  type ListFactsRow,
} from '../merge-queue/list-facts-data'
import type { listedGitHubRepositories } from '../merge-queue/read'
import { freshGitHubUserToken } from '../security/github-tokens'

type RepositoryRow = Awaited<
  ReturnType<typeof listedGitHubRepositories>
>[number]
type PullFact = { base?: string; fork: boolean }
type RepositoryFacts = {
  githubQueueRequired?: boolean
  pulls: Map<string, PullFact>
}

const REPOSITORIES_PER_REFRESH = 8

function writeAccess(payload: string | null | undefined, now: number) {
  if (!payload) return undefined
  const grant: unknown = JSON.parse(payload)
  if (grant === false || (isRecord(grant) && grant.canWrite === false))
    return false
  if (
    isRecord(grant) &&
    grant.canWrite === true &&
    typeof grant.verifiedAt === 'number' &&
    grant.verifiedAt + LIST_FACTS_FRESH_MS > now
  )
    return true
  return undefined
}

function repositoryFacts(payload: string | null): RepositoryFacts | undefined {
  if (!payload) return undefined
  const parsed: unknown = JSON.parse(payload)
  if (!isRecord(parsed) || !Array.isArray(parsed.pulls)) return undefined
  const rows: readonly unknown[] = parsed.pulls
  const pulls = new Map<string, PullFact>()
  for (const row of rows) {
    if (
      isRecord(row) &&
      typeof row.branch === 'string' &&
      typeof row.fork === 'boolean'
    )
      pulls.set(row.branch, {
        fork: row.fork,
        ...(typeof row.base === 'string' && { base: row.base }),
      })
  }
  return {
    ...(typeof parsed.githubQueueRequired === 'boolean' && {
      githubQueueRequired: parsed.githubQueueRequired,
    }),
    pulls,
  }
}

function due(row: ListFactsRow | undefined, now: number) {
  return (
    !row ||
    (row.freshUntil <= now && row.retryAt <= now && row.claimUntil <= now)
  )
}

async function checkedFacts(
  env: AppEnv,
  dependencies: AppDependencies,
  key: ListFactsKey,
  read: () => Promise<string | undefined>,
) {
  const id = dependencies.randomToken()
  const generation = await claimListFacts(env.DB, key, id, dependencies.now())
  if (generation === null) return undefined
  const payload = await read().catch(() => undefined)
  await finishListFacts(
    env.DB,
    key,
    id,
    generation,
    dependencies.now(),
    payload,
  )
  return payload
}

export async function cachedQueueListFacts(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  userId: string,
  catalogue: readonly RepositoryRow[],
  branches: ReadonlyMap<string, ReadonlySet<string>>,
) {
  const now = dependencies.now()
  const rows = await readListFacts(env.DB, orgId, userId, now)
  const accessByRepository = new Map<string, ListFactsRow>()
  const sharedByRepository = new Map<string, ListFactsRow>()
  for (const row of rows) {
    const byRepository =
      row.viewerId === '' ? sharedByRepository : accessByRepository
    byRepository.set(row.repositoryId, row)
  }
  const facts = new Map<
    string,
    { canWrite?: boolean; repository?: RepositoryFacts }
  >()
  const refreshes: { dueAt: number; run: () => Promise<void> }[] = []
  let credential: Promise<string | undefined> | undefined
  const token = () =>
    (credential ??= freshGitHubUserToken(env, userId, dependencies).catch(
      () => undefined,
    ))
  for (const repository of catalogue) {
    const heads = branches.get(repository.id)
    if (!heads?.size || repository.installationId === null) continue
    const binding = JSON.stringify([
      repository.installationId,
      repository.repositoryId,
      repository.fullName,
      repository.defaultBranch,
    ])
    const storedAccess = accessByRepository.get(repository.id)
    const storedShared = sharedByRepository.get(repository.id)
    const access = storedAccess?.binding === binding ? storedAccess : undefined
    const shared = storedShared?.binding === binding ? storedShared : undefined
    const canWrite = writeAccess(access?.payload, now)
    const repositoryCache = canWrite
      ? repositoryFacts(shared?.payload ?? null)
      : undefined
    facts.set(repository.id, {
      canWrite,
      repository: repositoryCache,
    })
    const accessDue = due(access, now)
    const sharedDue = due(shared, now)
    if (!accessDue && !(canWrite && sharedDue)) continue
    const key = { orgId, repositoryId: repository.id, binding }
    refreshes.push({
      dueAt: Math.min(
        accessDue ? (access?.freshUntil ?? 0) : Infinity,
        sharedDue ? (shared?.freshUntil ?? 0) : Infinity,
      ),
      run: async () => {
        const permission = accessDue
          ? await checkedFacts(
              env,
              dependencies,
              { ...key, viewerId: userId },
              async () => {
                const auth = await token()
                if (!auth) return undefined
                const canWrite = await readQueueWriteAccess(
                  dependencies.fetch,
                  auth,
                  repository,
                )
                return JSON.stringify({
                  canWrite,
                  verifiedAt: dependencies.now(),
                })
              },
            )
          : access?.payload
        if (!sharedDue || writeAccess(permission, dependencies.now()) !== true)
          return
        await checkedFacts(
          env,
          dependencies,
          { ...key, viewerId: '' },
          async () => {
            const auth = await token()
            if (!auth) return undefined
            const { fetch } = dependencies
            const [pulls, rules] = await Promise.allSettled([
              listQueuePulls(fetch, auth, repository, [...heads]),
              trunkRequiresMergeQueue(
                fetch,
                auth,
                repository.fullName,
                repository.defaultBranch,
              ),
            ])
            if (pulls.status === 'rejected' && rules.status === 'rejected')
              return undefined
            const pullFacts =
              pulls.status === 'fulfilled'
                ? [...pulls.value].map(([branch, pull]) => ({
                    branch,
                    fork: pull.kind === 'fork',
                    ...(pull.kind === 'open' && { base: pull.pull.base }),
                  }))
                : [...(repositoryCache?.pulls ?? [])].map(([branch, pull]) => ({
                    branch,
                    ...pull,
                  }))
            const githubQueueRequired =
              rules.status === 'fulfilled'
                ? rules.value
                : repositoryCache?.githubQueueRequired
            return JSON.stringify({ githubQueueRequired, pulls: pullFacts })
          },
        )
      },
    })
  }
  return {
    facts,
    refresh: refreshes.length
      ? async () => {
          await Promise.all(
            refreshes
              .sort((a, b) => a.dueAt - b.dueAt)
              .slice(0, REPOSITORIES_PER_REFRESH)
              .map(({ run }) => run()),
          )
        }
      : undefined,
  }
}
