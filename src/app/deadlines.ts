import { useMemo, useSyncExternalStore } from 'react'
import type { Delay } from './events'
import { useServices } from './services'

/**
 * The deadlines of a screen on the clock of the app, such as the last day
 * of each Restore that a list offers. `latestPassed` gives the latest
 * deadline that the clock reached. `subscribe` wakes its listener at each
 * later deadline through the scheduler of the app, so tests drive it with
 * their own clock and scheduler.
 */
class DeadlineClock {
  private readonly deadlines: readonly number[]
  private readonly now: () => number
  private readonly delay: Delay

  constructor(deadlines: readonly number[], now: () => number, delay: Delay) {
    this.deadlines = [...new Set(deadlines)].sort((a, b) => a - b)
    this.now = now
    this.delay = delay
  }

  readonly latestPassed = (): number => {
    const current = this.now()
    return this.deadlines.filter((at) => at <= current).at(-1) ?? -Infinity
  }

  /**
   * Wakes `listener` at the next deadline, then at each one after it. A
   * timer that wakes before its deadline only waits again.
   */
  readonly subscribe = (listener: () => void): (() => void) => {
    let cancel: (() => void) | null = null
    const arm = () => {
      const current = this.now()
      const next = this.deadlines.find((at) => at > current)
      cancel =
        next === undefined
          ? null
          : this.delay(next - current, () => {
              listener()
              arm()
            })
    }
    arm()
    return () => cancel?.()
  }
}

/**
 * Whether a deadline of `deadlines` has passed by the clock of the app. The
 * screen renders again at each deadline, so a control that ends then ends
 * while the page shows, with no other event. A null deadline never passes.
 */
export function usePassedDeadlines(
  deadlines: readonly (number | null)[],
): (deadline: number | null) => boolean {
  const { now, delay } = useServices()
  const key = deadlines.filter((at) => at !== null).join(',')
  const clock = useMemo(
    () =>
      new DeadlineClock(
        key === '' ? [] : key.split(',').map(Number),
        now,
        delay,
      ),
    [key, now, delay],
  )
  const latest = useSyncExternalStore(
    clock.subscribe,
    clock.latestPassed,
    clock.latestPassed,
  )
  return (deadline) => deadline !== null && deadline <= latest
}
