import type { ChangeResult } from './settings-results'

/** How long the bar shows a Stop that the Mac made and saved. */
const DONE_STOP_SHOWS_MS = 5_000

/**
 * The result when it is a Stop that the Mac made and saved, else null. The
 * bar shows such a Stop for 5 seconds from its end. A failure, or a Stop
 * that the Mac did not save, stays until the next change.
 */
export function doneStop(
  result: ChangeResult | undefined,
): ChangeResult | null {
  return result?.change.action === 'stop-workspace' &&
    result.outcome.status === 'done'
    ? result
    : null
}

/** Whether the 5 seconds of a done Stop on the bar ended at `now`. */
export function doneStopGone(result: ChangeResult, now: number): boolean {
  return now - result.at >= DONE_STOP_SHOWS_MS
}
