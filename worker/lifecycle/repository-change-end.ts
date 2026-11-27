import { HttpError } from '../http'
import { warnWorker } from '../warnings'
import { WarningId } from '../warning-values'
import {
  BranchReadFailed,
  repositoryChangeFailed,
} from './repository-change-errors'
import type { RepositoryChangeProgress } from './repository-change-progress'
import type {
  RepositoryChangeJob,
  RepositoryChangeOptions,
} from './repository-change-types'
import { readWorkspace } from './workspace-data'

/** A step after the move that fails for this time ends the change. */
export const AFTER_MOVE_LIMIT_MS = 10 * 60 * 1_000

/** Errors while reading a moved branch, recording a clone, or publishing. */
export function failedAfterMove(
  job: RepositoryChangeJob,
  error: unknown,
): boolean {
  return (
    job.phase === 'publish' ||
    job.cloneInstalled === true ||
    error instanceof BranchReadFailed
  )
}

/**
 * The end rule of a step after the move. The first failure saves its time.
 * After `AFTER_MOVE_LIMIT_MS`, the job ends with a failure and a warning,
 * but only while the record still names the old repository and branch. A
 * record that already changed keeps the retry, because the publication
 * must then finish. A failed read of the record also keeps the retry.
 * Returns true when the job ended.
 */
export async function endAfterMove(
  options: RepositoryChangeOptions,
  progress: RepositoryChangeProgress,
  job: RepositoryChangeJob,
  error: unknown,
): Promise<boolean> {
  const now = options.dependencies.now()
  if (job.failingSince === undefined) {
    job.failingSince = now
    await progress.save(job)
    return false
  }
  if (now - job.failingSince < AFTER_MOVE_LIMIT_MS) return false
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
  const failure =
    error instanceof HttpError
      ? error
      : (job.failure ?? repositoryChangeFailed(job))
  warnWorker({
    kind: 'repository_change_ended',
    workspaceId: WarningId.checked(job.binding.id),
    phase: job.phase === 'publish' ? 'publish' : 'move',
  })
  await progress.finish(job, {
    ok: false,
    error: {
      status: failure.status,
      code: failure.code,
      message: failure.message,
    },
  })
  return true
}
