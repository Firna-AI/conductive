/**
 * The words of the wake-ups of an agent: a pending wake-up of a session,
 * the line that a wake-up adds at its time, and the line of a wake-up that
 * ended with no turn. The wake-up line gives one text to the chat, to the
 * agent, to the copy of a transcript, and to `read_session`. The app, the
 * Worker, and the mockups take the words from here, so the texts cannot
 * drift apart. The module draws nothing and reads no fixtures.
 *
 * A time comes in Unix milliseconds. The chat gives it in the local time of
 * the reader, from `wakeUpTime`. A text without a reader, such as a copy,
 * gives it in UTC, from `wakeUpTimeUtc`.
 */

import { reconnectAction, type SessionLoginOwner } from './secretRunCopy'

/** The fixed lead of the wake-up line, before the text that the agent set. */
export const wakeUpLead = 'Wake-up:'

/**
 * @public The text of the wake-up line for the agent, a copy, and
 * `read_session`: the lead, then the text that the agent set. The agent
 * gets it as a message, with its `Sent by:` line.
 */
export function wakeUpText(text: string): string {
  return `${wakeUpLead} ${text}`
}

/** The words of the pending wake-ups above the composer. */
export const wakeUpWords = {
  cancel: 'Cancel',
  /** The spoken name of the group of the pending wake-ups. */
  region: 'Pending wake-ups',
} as const

/** The title of a pending wake-up, such as "Wake-up tomorrow at 09:00". */
export function pendingWakeUpTitle(time: string): string {
  return `Wake-up ${time}`
}

/** The spoken name of the Cancel of one pending wake-up. */
export function cancelWakeUpLabel(time: string): string {
  return `Cancel the wake-up for ${time}`
}

/**
 * The line of a Cancel. `who` is "You" for the member who pressed it, and
 * the name of that member for the others, such as "Priya Raman cancelled
 * the wake-up for tomorrow at 09:00".
 */
export function memberCancelled(who: string, time: string): string {
  return `${who} cancelled the wake-up for ${time}`
}

/** The line of a Cancel by a member who left the org, which names nobody. */
export function cancelledUnnamed(time: string): string {
  return `The wake-up for ${time} was cancelled`
}

/**
 * Why a wake-up that reached its time could start no turn, by the action
 * that gets the agent going again. `next-message`: the member whom the
 * turn acts for left the org, or the starter no longer shares the login
 * with that member. `reconnect`: the login of the session is gone, so its
 * owner, or for the org login an admin, connects it again. `agent` is the
 * name of the agent, such as "Claude". The other two name the cause.
 */
export type WakeUpMiss =
  | { kind: 'next-message' }
  | { kind: 'reconnect'; owner: SessionLoginOwner; agent: string }
  | { kind: 'session-closed' }
  | { kind: 'archived' }

/**
 * The line of a wake-up that reached its time and could start no turn: it
 * says so, then names the action that gets the agent going again, as the
 * line of a late secret request does, or the cause.
 */
export function notStarted(time: string, miss: WakeUpMiss): string {
  const lead = `The wake-up for ${time} could not start`
  switch (miss.kind) {
    case 'next-message':
      return `${lead}. The agent can go on at the next message.`
    case 'reconnect':
      return `${lead}. The agent can go on after ${reconnectAction(miss.owner, miss.agent)} again.`
    case 'session-closed':
      return `${lead}, because the session was closed.`
    case 'archived':
      return `${lead}, because the workspace was archived.`
  }
}

/**
 * The clock of the person who reads the chat: now, in Unix milliseconds,
 * and the time zone of that person. Without `timeZone`, the words take the
 * time zone of the browser.
 */
export interface ReaderClock {
  now: number
  timeZone?: string
}

const dayMs = 86_400_000

/** The day of `at` in `timeZone`, counted from 1 January 1970, and its year. */
function calendarDay(at: number, timeZone?: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone,
  }).formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value)
  const year = part('year')
  return { day: Date.UTC(year, part('month') - 1, part('day')) / dayMs, year }
}

/** The time of `at` on the 24-hour clock, such as 09:00. */
function clockTime(at: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(at)
}

/** The words of a day near today, or nothing for another day. */
function nearDay(days: number): string | undefined {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return undefined
}

/** The day of `at` as "Mon 30 Nov", with its year when asked. */
function dayWords(at: number, withYear: boolean, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
    timeZone,
  })
    .formatToParts(at)
    .filter((part) => part.type !== 'literal')
    .map((part) => part.value)
    .join(' ')
}

/**
 * The time of a wake-up in the local time of the reader, on the 24-hour
 * clock: "today at 16:30", "tomorrow at 09:00", "yesterday at 09:00", or
 * its day, such as "Mon 30 Nov at 09:00". A day of another year adds the
 * year, such as "Mon 4 Jan 2027 at 09:00". The words never start a
 * sentence, so they start in lower case.
 */
export function wakeUpTime(at: number, clock: ReaderClock): string {
  const { timeZone } = clock
  const day = calendarDay(at, timeZone)
  const today = calendarDay(clock.now, timeZone)
  const near = nearDay(day.day - today.day)
  const date = near ?? dayWords(at, day.year !== today.year, timeZone)
  return `${date} at ${clockTime(at, timeZone)}`
}

/**
 * @public The time of a wake-up in UTC, for a text without a reader, such
 * as a copy and `read_session`, as a copy gives the time of the copy:
 * "24 November 2026, 09:00 UTC".
 */
export function wakeUpTimeUtc(at: number): string {
  const day = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(at)
  return `${day}, ${clockTime(at, 'UTC')} UTC`
}
