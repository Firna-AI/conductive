import { useState, useSyncExternalStore } from 'react'

/** The time source of the chat. Tests and the dev page pass a fixed clock. */
export interface Clock {
  now(): number
}

export const systemClock: Clock = { now: () => Date.now() }

/** Reads a clock once a second while a part on screen needs the time. */
class Ticker {
  private readonly clock: Clock
  private readonly listeners = new Set<() => void>()
  private handle: ReturnType<typeof setInterval> | null = null
  private value: number

  constructor(clock: Clock) {
    this.clock = clock
    this.value = clock.now()
  }

  read = (): number => this.value

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    this.value = this.clock.now()
    this.handle ??= setInterval(() => {
      this.value = this.clock.now()
      for (const notify of this.listeners) notify()
    }, 1_000)
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size > 0 || this.handle === null) return
      clearInterval(this.handle)
      this.handle = null
    }
  }

  still = (): (() => void) => () => {}
}

/**
 * The time now, read again each second while `ticking` holds, such as while
 * a turn runs or a sandbox starts.
 */
export function useNow(clock: Clock, ticking: boolean): number {
  const [ticker] = useState(() => new Ticker(clock))
  return useSyncExternalStore(
    ticking ? ticker.subscribe : ticker.still,
    ticker.read,
    ticker.read,
  )
}
