import { useState } from 'react'
import type { Clock } from '../ui/clock'
import type { ChangeResult } from './settings-results'

/** How long the bar shows a Stop that the Mac made and saved. */
export const DONE_STOP_SHOWS_MS = 5_000

/** Where a done Stop is in its time on the bar. */
export interface DoneStopTime {
  /** The done Stop shows, so the bar reads the time each second. */
  fading: boolean
  /** The time of the done Stop ended, so the bar no longer shows it. */
  gone: boolean
}

const none: DoneStopTime = { fading: false, gone: false }

/**
 * The time of the last result of the Stop of one workspace on the bar,
 * when the Mac made and saved that Stop. It starts at the first render
 * that has the result and lasts 5 seconds. A new Stop gives a new result,
 * so its time starts again. A failure, or a Stop that the Mac did not
 * save, gets no time, because it stays until the next change. A new mount
 * of the bar starts the time again.
 */
export function useDoneStopTime(
  result: ChangeResult | undefined,
  clock: Clock,
): DoneStopTime {
  const done =
    result?.change.action === 'stop-workspace' &&
    result.outcome.status === 'done'
      ? result
      : null
  const [first, setFirst] = useState<{
    result: ChangeResult
    at: number
  } | null>(null)
  if (done === null) return none
  // React renders again at once with the time of a new result.
  if (first?.result !== done) setFirst({ result: done, at: clock.now() })
  const at = first?.result === done ? first.at : clock.now()
  const gone = clock.now() - at >= DONE_STOP_SHOWS_MS
  return { fading: !gone, gone }
}
