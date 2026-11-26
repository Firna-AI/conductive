import { ApiError, errorMessage } from '../app/api/client'
import type { Delay } from '../app/events'
import type { Readable } from '../app/store'
import type { GitHubMergeRequest } from '../shared/generated/GitHubMergeRequest'
import type { BarActionsPorts } from './barPorts'
import type { BarOutcome } from './barView'
import { GitHubActionError, unfinishedAction } from './githubActions'
import type { GitHubSnapshot } from './githubClient'

/**
 * The wait before the bar reads a pending merge or Continue again. It is a
 * choice of the app, not a product limit.
 */
export const pendingJobWait = 1_000

/** Submit the merge to the queue or poll an ordinary GitHub merge. */
export async function runBarMerge(
  { github, delay }: Pick<BarActionsPorts, 'github' | 'delay'>,
  { queue, mergeStack }: GitHubSnapshot,
  { pullNumber, headSha, method }: GitHubMergeRequest & { pullNumber: number },
  signal: AbortSignal,
): Promise<void> {
  if (queue?.mergeAhead !== undefined)
    return github.mergeQueue({ ahead: queue.mergeAhead }, signal)
  const stackCount = mergeStack?.count
  if (mergeStack?.queue === 'same-org')
    return github.mergeQueue(
      { pullNumber, headSha, stackCount: mergeStack.count },
      signal,
    )
  let reply = await github.merge(
    { headSha, method, ...(stackCount !== undefined && { stackCount }) },
    signal,
  )
  while (reply.state === 'pending') {
    await waitFor(delay, pendingJobWait, signal)
    reply = await github.mergeResult(reply.mergeId, signal)
  }
}

/** Waits for `ms` with the timer of the app. An abort ends the wait. */
export function waitFor(
  delay: Delay,
  ms: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    let cancel = () => {}
    const abort = () => {
      cancel()
      reject(signal.reason)
    }
    cancel = delay(ms, () => {
      signal.removeEventListener('abort', abort)
      resolve()
    })
    signal.addEventListener('abort', abort, { once: true })
  })
}

/**
 * Waits until the workspace stream applied the event with `eventNumber`, so
 * that each change that the event carries shows. An abort ends the wait.
 */
export function streamReaches(
  last: Readable<number>,
  eventNumber: number,
  signal: AbortSignal,
): Promise<void> {
  if (last.get() >= eventNumber) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    let stop = () => {}
    const abort = () => {
      stop()
      reject(signal.reason)
    }
    stop = last.subscribe(() => {
      if (last.get() < eventNumber) return
      stop()
      signal.removeEventListener('abort', abort)
      resolve()
    })
    signal.addEventListener('abort', abort, { once: true })
  })
}

/**
 * The outcome of a merge that GitHub or the app refused. A moved head and a
 * missing right have the app's own words. Another refusal of GitHub says
 * only that GitHub refused. Any other failure keeps the app's safe words.
 */
export function mergeOutcome(error: unknown): BarOutcome {
  if (!(error instanceof GitHubActionError)) {
    return { kind: 'merge-failed', message: unfinishedAction }
  }
  switch (error.code) {
    case 'github_head_changed':
      return { kind: 'merge-refused', reason: 'merge-moved-head' }
    case 'github_merge_forbidden':
    case 'merge_queue_write_required':
      return { kind: 'merge-refused', reason: 'merge-no-right' }
    case 'github_merge_refused':
      return { kind: 'merge-refused', reason: 'merge-refused' }
    default:
      return { kind: 'merge-failed', message: error.message }
  }
}

/**
 * The outcome of Ready for review that GitHub or the app refused. A missing
 * right, another pull request, and another refusal of GitHub take the
 * shared words of `barCopy`. Any other failure keeps the app's safe words.
 */
export function readyOutcome(error: unknown): BarOutcome {
  if (!(error instanceof GitHubActionError)) {
    return { kind: 'ready-failed', message: unfinishedAction }
  }
  switch (error.code) {
    case 'github_ready_forbidden':
      return { kind: 'ready-refused', reason: 'ready-no-right' }
    case 'github_pull_changed':
      return { kind: 'ready-refused', reason: 'ready-pull-changed' }
    case 'github_ready_refused':
      return { kind: 'ready-refused', reason: 'ready-refused' }
    default:
      return { kind: 'ready-failed', message: error.message }
  }
}

/**
 * The outcome of a Continue that the Worker refused or stopped. A turn that
 * runs shows the wait. Each other cause keeps the Worker's safe words, so
 * the words of a clash show only for a real clash of the changed files.
 */
export function continueOutcome(error: unknown): BarOutcome {
  if (error instanceof ApiError && error.code === 'workspace_turn_running') {
    return { kind: 'continue-waits' }
  }
  return { kind: 'continue-failed', message: errorMessage(error) }
}
