import { createContext, useState, useSyncExternalStore } from 'react'

/** The time source of the chat. Tests and the dev page pass a fixed clock. */
export interface Clock {
  now(): number
  /**
   * The time zone of the reader, for the words of a time of day, such as
   * the time of a wake-up. Without it, the chat takes the time zone of the
   * browser.
   */
  timeZone?: string
}

export const systemClock: Clock = { now: () => Date.now() }

/**
 * The clock of the chat, which `ChatBody` gives from its `clock`. A part
 * that shows a live time, such as the time of a running turn, reads it and
 * keeps its own tick while it shows, with `useNow`. So the time moves on in
 * each chat that shows it, such as the popover of an explanation over an
 * idle session.
 */
export const ChatClock = createContext<Clock>(systemClock)

/** Reads a clock once a period while a part on screen needs the time. */
class Ticker {
  private readonly clock: Clock
  private readonly period: number
  private readonly listeners = new Set<() => void>()
  private handle: ReturnType<typeof setInterval> | null = null
  private value: number

  constructor(clock: Clock, period: number) {
    this.clock = clock
    this.period = period
    this.value = clock.now()
  }

  read = (): number => this.value

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    this.value = this.clock.now()
    this.handle ??= setInterval(() => {
      this.value = this.clock.now()
      for (const notify of this.listeners) notify()
    }, this.period)
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
 * The time now, read again each `period` of milliseconds while `ticking`
 * holds, such as each second while a turn runs or a sandbox starts.
 */
export function useNow(clock: Clock, ticking: boolean, period = 1_000): number {
  const [ticker] = useState(() => new Ticker(clock, period))
  return useSyncExternalStore(
    ticking ? ticker.subscribe : ticker.still,
    ticker.read,
    ticker.read,
  )
}
