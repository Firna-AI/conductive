import { requireActiveWorkspaceOwner } from '../data/user-access'
import type { AppDependencies, AppEnv } from '../env'
import type { GitHubWorkspace } from '../github/contracts'
import type { ReceiverStorage } from '../members/receiver-storage'
import { providerForAccount } from '../sandbox/client'
import {
  baseChangeComputerReady,
  boundBaseWorkspace,
} from './base-change-access'
import type { WorkspaceBaseFetches } from './base-change-fetch'
import {
  HEAD_SYNC_NEEDS_TURN,
  queueHeadCommand,
  queueHeadGuardCommand,
} from './queue-head-command'
import type { CommandResult } from '../sandbox/provider'
import { pendingWorkspaceChange } from './repository-change-types'
import { workspaceRepositoryLocations } from './repository-location-data'
import { repositoryLocation } from './repository-locations'

export type QueueHeadSyncResult = 'done' | 'active-turn' | 'restack' | 'retry'
type IdleGuard = (
  operation: () => Promise<QueueHeadSyncResult>,
) => Promise<QueueHeadSyncResult>

function syncResult(result: CommandResult): QueueHeadSyncResult {
  if (result.timedOut) return 'retry'
  if (result.exitCode === HEAD_SYNC_NEEDS_TURN) return 'restack'
  return result.exitCode === 0 ? 'done' : 'retry'
}

export async function syncQueueHead(
  {
    env,
    dependencies,
    storage,
    fetches,
  }: {
    env: AppEnv
    dependencies: AppDependencies
    storage: ReceiverStorage
    fetches: WorkspaceBaseFetches
  },
  binding: GitHubWorkspace,
  head: { oldHead: string; newHead: string },
  whenIdle: IdleGuard,
): Promise<QueueHeadSyncResult> {
  const idle = await whenIdle(() => Promise.resolve('done'))
  if (idle !== 'done') return idle
  const bound = await boundBaseWorkspace(env.DB, binding)
  if (!bound) return 'retry'
  const { row } = bound
  if (row.archivedAt !== null || row.state === 'archived') return 'retry'
  const { sandboxId, ownerUserId, providerAccount } = row
  if (!sandboxId) return 'done'
  if (row.state === 'starting') return 'retry'
  if (!baseChangeComputerReady(row)) return 'restack'
  const authorize = async () => {
    const current = await boundBaseWorkspace(env.DB, binding)
    if (
      !current ||
      current.row.sandboxId !== sandboxId ||
      current.row.ownerUserId !== ownerUserId ||
      current.row.repositoryId !== row.repositoryId ||
      current.row.providerAccount !== providerAccount ||
      !baseChangeComputerReady(current.row) ||
      (await pendingWorkspaceChange(storage))
    )
      return false
    await requireActiveWorkspaceOwner(env.DB, ownerUserId, binding.orgId)
    return true
  }
  const fetchId = `baseChange-${dependencies.randomToken()}`
  const stage = `/tmp/conductive-base-change/${encodeURIComponent(binding.id)}/sync-${encodeURIComponent(head.newHead)}.git`
  const provider = providerForAccount(env, dependencies.fetch, providerAccount)
  const directory = repositoryLocation(
    await workspaceRepositoryLocations(env.DB, row.id),
    row.repositoryId,
  )
  const input = { ...head, directory, branch: binding.branch }
  const clean = await whenIdle(async () =>
    (await authorize())
      ? syncResult(
          await provider.runCommand(sandboxId, queueHeadGuardCommand(input)),
        )
      : 'retry',
  )
  if (clean !== 'done') return clean
  // The credential helper enters the workspace sequence. Hold it only for
  // the local command, which has no credential.
  const fetched = await fetches.fetch(
    provider,
    sandboxId,
    {
      stage,
      baseBranch: binding.branch,
      fullName: binding.fullName,
      fetchId,
    },
    { authorize, ownerUserId },
  )
  if (!fetched) return 'retry'
  return whenIdle(async () => {
    if (!(await authorize())) return 'retry'
    return syncResult(
      await provider.runCommand(
        sandboxId,
        queueHeadCommand({ ...input, stage }),
      ),
    )
  })
}
