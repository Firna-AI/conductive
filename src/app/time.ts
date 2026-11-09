import { useEffect, useState } from 'react'
import { useServices } from './services'

const minute = 60_000
const hour = 60 * minute
const day = 24 * hour

/** The short age of a list row: now, 5m, 2h, or 3d. */
export function formatAgo(now: number, then: number): string {
  const age = Math.max(0, now - then)
  if (age < minute) return 'now'
  if (age < hour) return `${Math.floor(age / minute)}m`
  if (age < day) return `${Math.floor(age / hour)}h`
  return `${Math.floor(age / day)}d`
}

function dayKey(time: number, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(time)
}

function plural(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'}`
}

/**
 * When something happened, as words that fit in a sentence: a time
 * relative to now, such as "12 minutes ago" or "yesterday", or a calendar
 * date, such as "3 Nov". The kind lets a sentence say "built on 3 Nov".
 */
export type When =
  { kind: 'relative'; text: string } | { kind: 'date'; text: string }

export function whenOf(now: number, then: number, timeZone?: string): When {
  const age = Math.max(0, now - then)
  if (age < minute) return { kind: 'relative', text: 'just now' }
  if (age < hour) {
    return {
      kind: 'relative',
      text: `${plural(Math.floor(age / minute), 'minute')} ago`,
    }
  }
  if (dayKey(now, timeZone) === dayKey(then, timeZone)) {
    return {
      kind: 'relative',
      text: `${plural(Math.floor(age / hour), 'hour')} ago`,
    }
  }
  if (dayKey(now - day, timeZone) === dayKey(then, timeZone)) {
    return { kind: 'relative', text: 'yesterday' }
  }
  const sameYear =
    dayKey(now, timeZone).slice(0, 4) === dayKey(then, timeZone).slice(0, 4)
  const text = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
    timeZone,
  }).format(then)
  return { kind: 'date', text }
}

/** When something happened, as a label: 12 minutes ago, Yesterday, 3 Nov. */
export function formatWhen(
  now: number,
  then: number,
  timeZone?: string,
): string {
  const { text } = whenOf(now, then, timeZone)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** A length of time: 41s, 6m 02s, or 1h 05m. */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`
  }
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

/** The time since a start, as the starting card counts it: 6s, or 2m 14s. */
export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

/** A day of the year: 12 November. */
export function formatDay(time: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(time)
}

/** The time now, which moves on at each interval while a screen shows it. */
export function useNow(intervalMs: number): number {
  const { now } = useServices()
  const [time, setTime] = useState(() => now())
  useEffect(() => {
    const timer = setInterval(() => setTime(now()), intervalMs)
    return () => clearInterval(timer)
  }, [now, intervalMs])
  return time
}
