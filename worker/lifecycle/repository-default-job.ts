import type { ReceiverStorage } from '../members/receiver-storage'
import {
  BASE_CHANGE_JOB_KEY,
  sameBaseChangeJob,
  type BaseChangeJob,
} from './base-change-job'
import {
  repositoryDefaultBinding,
  unfinishedRepositoryDeliveries,
} from './repository-default-data'

/** Prepared names are proposals. Only the saved repository names the target. */
export async function currentRepositoryDefaultJob(
  db: D1Database,
  storage: ReceiverStorage,
  job: BaseChangeJob,
): Promise<BaseChangeJob | null> {
  if (!job.repositoryBeforeSave) return job
  const binding = await repositoryDefaultBinding(db, job)
  if (!binding) return null
  const deliveries = await unfinishedRepositoryDeliveries(
    db,
    job.repositoryDeliveries ?? [],
  )
  if (
    binding.fullName === job.binding.fullName &&
    binding.installationId === job.binding.installationId &&
    binding.defaultBranch === job.change.to &&
    deliveries.length === (job.repositoryDeliveries?.length ?? 0)
  )
    return job
  return storage.transaction(async (transaction) => {
    const pending = await transaction.get<BaseChangeJob | null>(
      BASE_CHANGE_JOB_KEY,
    )
    if (!sameBaseChangeJob(pending, job)) return null
    const current: BaseChangeJob = {
      ...job,
      binding,
      change: { ...job.change, to: binding.defaultBranch },
      revision: crypto.randomUUID(),
      repositoryDeliveries: deliveries,
    }
    await transaction.put(BASE_CHANGE_JOB_KEY, current)
    return current
  })
}
