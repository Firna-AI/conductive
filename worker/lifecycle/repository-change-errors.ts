import { repositoryFailure } from '../../src/ui/components/workspace/repositoryMoveCopy'
import { HttpError } from '../http'
import type { RepositoryChangeJob } from './repository-change-types'

/** The move exits with this code when the context folder could not be copied. */
export const CONTEXT_COPY_FAILED = 81
/** The move exits with this code when Git refused the checkout of the new branch. */
export const CHECKOUT_REFUSED = 82

/** A runner without `repositoryFolder` in its hello cannot move (decision 5 A). */
export function softwareOutdated(): HttpError {
  return new HttpError(
    409,
    'workspace_software_outdated',
    'Restart the software, then try again.',
  )
}

function changeFailure(message: string): HttpError {
  return new HttpError(409, 'workspace_repository_change_failed', message)
}

export function repositoryChangeCouldNotFinish(): HttpError {
  return changeFailure('The repository change could not finish. Try again.')
}

/** The reason of a failed change, for the toast "The repository didn't change." */
export function repositoryChangeFailed(
  job: Pick<RepositoryChangeJob, 'phase' | 'baseBranch' | 'target'>,
  exitCode: number | null = null,
): HttpError {
  if (job.phase === 'move' && exitCode === CHECKOUT_REFUSED)
    return changeFailure(repositoryFailure.clash(job.target.fullName))
  if (job.phase === 'move' && exitCode === CONTEXT_COPY_FAILED)
    return changeFailure(
      `The context folder could not be copied to ${job.target.fullName}. Check the files of both context folders, then try again.`,
    )
  if (job.phase === 'fetch')
    return changeFailure(
      `The latest ${job.baseBranch} of ${job.target.fullName} could not be fetched. Check your GitHub access, then try again.`,
    )
  if (job.phase === 'runner')
    return changeFailure("The cloud computer isn't ready. Try again.")
  return repositoryChangeCouldNotFinish()
}

/** The branch read of the new folder exited with a failure or timed out. */
export class BranchReadFailed extends Error {
  constructor() {
    super('The repository change still needs reconciliation.')
  }
}
