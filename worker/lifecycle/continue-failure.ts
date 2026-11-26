import { HttpError } from '../http'
import { readContinueStopCause } from './continue-stop-causes'
import type { ContinueJob } from './continue-types'

export function continueFailed(job: ContinueJob): HttpError {
  // The stop messages belong to plans/follow-ups/continue-stop-cause-copy.md.
  return new HttpError(
    409,
    'workspace_continue_failed',
    readContinueStopCause(job.stopCause) === 'checkout-clash'
      ? `Continue stopped: the changed files clash with the latest ${job.baseBranch}. The workspace stays on ${job.binding.branch}.`
      : job.phase === 'fetch'
        ? 'Continue could not finish. Check GitHub access and try again.'
        : 'Continue could not finish.',
  )
}
