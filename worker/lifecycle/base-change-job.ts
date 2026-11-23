import type {
  GitHubSnapshot,
  GitHubStateTransaction,
  GitHubWorkspace,
} from '../github/contracts'

export const BASE_CHANGE_JOB_KEY = 'baseChange:job'

export interface BaseChangeJob {
  id: string
  binding: GitHubWorkspace
  change: { from: string; to: string }
  at: number
  failures: number
  revision?: string
  queueBase?: { repositoryId: string; from: string | null; to: string | null }
  repositoryDeliveries?: string[]
  repositoryBeforeSave?: {
    fullName: string
    defaultBranch: string
    installationId: number
  }
}

export function sameBaseChangeJob(
  pending: BaseChangeJob | null | undefined,
  job: BaseChangeJob,
): pending is BaseChangeJob {
  return pending?.id === job.id && pending.revision === job.revision
}

/** The marker, retry record, and alarm source share the snapshot transaction. */
export async function saveBaseChangeJob(
  transaction: GitHubStateTransaction,
  snapshot: GitHubSnapshot,
  binding: GitHubWorkspace,
  now: number,
): Promise<void> {
  const pending = await transaction.get<BaseChangeJob | null>(
    BASE_CHANGE_JOB_KEY,
  )
  if (pending?.binding.branch === snapshot.banner.branch) {
    if (!pending.queueBase) snapshot.baseChange ??= pending.change
    return
  }
  if (!snapshot.baseChange) return
  const job: BaseChangeJob = {
    id: `baseChange-${crypto.randomUUID()}`,
    binding,
    change: snapshot.baseChange,
    at: now,
    failures: 0,
  }
  await transaction.put(BASE_CHANGE_JOB_KEY, job)
  await transaction.put('alarm:baseChange', now)
}
