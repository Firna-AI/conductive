import type {
  GitHubSnapshot,
  GitHubStateTransaction,
  GitHubWorkspace,
} from '../github/contracts'
import type { WorkspaceTargetChange } from '../github/base-data'

export const BASE_CHANGE_JOB_KEY = 'baseChange:job'

export interface BaseChangeJob {
  id: string
  binding: GitHubWorkspace
  change: { from: string; to: string }
  at: number
  failures: number
  /** The stored workspace base after a guarded target write. */
  target?: string | null
  revision?: string
  repositoryDeliveries?: string[]
  repositoryBeforeSave?: {
    fullName: string
    defaultBranch: string
    installationId: number
  }
}

type BaseChangeTransaction = Pick<GitHubStateTransaction, 'get' | 'put'>

/** Save the move returned by the D1 write and retire any earlier repair. */
export async function saveWorkspaceTargetChange(
  transaction: BaseChangeTransaction,
  move: WorkspaceTargetChange,
  now: number,
): Promise<void> {
  const snapshot = await transaction.get<GitHubSnapshot>('github:state')
  if (snapshot?.banner.branch === move.binding.branch && snapshot.baseChange) {
    delete snapshot.baseChange
    await transaction.put('github:state', snapshot)
  }
  await putBaseChangeJob(transaction, move, now)
}

export function sameBaseChangeJob(
  pending: BaseChangeJob | null | undefined,
  job: BaseChangeJob,
): pending is BaseChangeJob {
  return pending?.id === job.id && pending.revision === job.revision
}

/** The marker, retry record, and alarm source share the snapshot transaction. */
export async function saveBaseChangeJob(
  transaction: BaseChangeTransaction,
  snapshot: GitHubSnapshot,
  binding: GitHubWorkspace,
  now: number,
): Promise<void> {
  const pending = await transaction.get<BaseChangeJob | null>(
    BASE_CHANGE_JOB_KEY,
  )
  if (
    pending?.binding.branch === snapshot.banner.branch &&
    pending.target === undefined
  ) {
    snapshot.baseChange ??= pending.change
    return
  }
  if (!snapshot.baseChange) return
  if (
    pending?.target !== undefined &&
    binding.baseBranch !== snapshot.baseChange.from
  ) {
    delete snapshot.baseChange
    return
  }
  await putBaseChangeJob(
    transaction,
    { binding, change: snapshot.baseChange },
    now,
  )
}

async function putBaseChangeJob(
  transaction: BaseChangeTransaction,
  move: Pick<BaseChangeJob, 'binding' | 'change' | 'target'>,
  now: number,
): Promise<void> {
  const job: BaseChangeJob = {
    ...move,
    id: `baseChange-${crypto.randomUUID()}`,
    at: now,
    failures: 0,
  }
  await transaction.put(BASE_CHANGE_JOB_KEY, job)
  await transaction.put('alarm:baseChange', now)
}
