import { warnWorker } from '../warnings'
import { WarningId } from '../warning-values'
import { repositoryChangeCouldNotFinish } from './repository-change-errors'
import type { RepositoryChangeProgress } from './repository-change-progress'
import type {
  RepositoryChangeJob,
  RepositoryChangeOptions,
} from './repository-change-types'
import { readWorkspace } from './workspace-data'

const FAILURE_LIMIT_MS = 10 * 60 * 1_000

/**
 * The first failed advance saves its time. After ten minutes of failures,
 * the job ends if the record still names the old repository and branch.
 * The job keeps retrying if the record already changed or the read fails.
 * Returns true when the job ended.
 */
export async function endAfterFailure(
  options: RepositoryChangeOptions,
  progress: RepositoryChangeProgress,
  job: RepositoryChangeJob,
  phase: 'fetch' | 'move' | 'publish',
): Promise<boolean> {
  const now = options.dependencies.now()
  if (job.failingSince === undefined) {
    job.failingSince = now
    await progress.save(job)
    return false
  }
  if (now - job.failingSince < FAILURE_LIMIT_MS) return false
  const row = await readWorkspace(
    options.env.DB,
    job.binding.orgId,
    job.binding.id,
  ).catch(() => null)
  if (
    !row ||
    row.repositoryId !== job.repositoryId ||
    row.branch !== job.binding.branch
  )
    return false
  warnWorker({
    kind: 'repository_change_ended',
    workspaceId: WarningId.checked(job.binding.id),
    phase,
  })
  const { status, code, message } =
    job.failure ?? repositoryChangeCouldNotFinish()
  await progress.finish(job, { ok: false, error: { status, code, message } })
  return true
}
