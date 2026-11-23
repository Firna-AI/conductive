/**
 * The words of the wake-ups of an agent: a pending wake-up of a session,
 * the line that a wake-up adds at its time, and the line of a wake-up that
 * ended with no turn. The wake-up line gives one text to the chat, to the
 * agent, to the copy of a transcript, and to `read_session`. A copy and
 * `read_session` also end with the pending wake-ups of the session, from
 * `pendingWakeUpsCopy`. The app, the Worker, and the mockups take the words
 * from here, so the texts cannot drift apart. The module draws nothing and
 * reads no fixtures.
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
 * `read_session`: the lead in its own paragraph, then the agent's text.
 * The agent gets it as a message, with its `Sent by:` line.
 */
export function wakeUpText(text: string): string {
  return `${wakeUpLead}\n\n${text}`
}

/** The words of the pending wake-ups above the composer. */
export const wakeUpWords = {
  cancel: 'Cancel',
  /**
   * The name of the group of the pending wake-ups: its spoken name in the
   * chat, and its heading at the end of a copy.
   */
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
 * The words before the session whose agent cancelled a wake-up with a
 * workspace tool, as "Stopped from" comes before the session of a stop.
 */
const cancelledFrom = 'Cancelled from'

/**
 * The words of the line of a cancel through the workspace tools, before
 * the sending session: the title of the card of the wake-up, then
 * "Cancelled from", such as "Wake-up tomorrow at 09:00 · Cancelled from".
 * The line names no member, as a stop through the tools names none. The
 * chat shows the chip of the sending session after the words, also when
 * the agent of the same session cancelled the wake-up.
 */
export function cancelledFromLead(time: string): string {
  return `${pendingWakeUpTitle(time)} · ${cancelledFrom}`
}

/**
 * @public The line of a cancel through the workspace tools as one text,
 * with `session` in place of the chip: the session link of the sending
 * session, as a copy and `read_session` give it, such as "Wake-up 24
 * November 2026, 09:00 UTC · Cancelled from <link>".
 */
export function cancelledFromText(time: string, session: string): string {
  return `${cancelledFromLead(time)} ${session}`
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

/** The last time that a JavaScript date holds: 13 September 275760. */
const dateLimit = 8_640_000_000_000_000

/** 400 years of the Gregorian calendar, after which its days repeat. */
const cycleMs = 146_097 * dayMs

/** 1 January 2000, the start of the cycle that a far time moves to. */
const cycleStart = Date.UTC(2000, 0, 1)

/**
 * A time for the words of `at` that a JavaScript date holds, and the years
 * that the words add to its year. A wire time can be any safe integer, also
 * past the dates of JavaScript, which end in the year 275760. Such a time
 * moves by whole 400-year cycles into the years 2000 to 2399. The move
 * keeps its day, its month, its weekday, and its time of day.
 */
function shownTime(at: number): { at: number; years: number } {
  if (Math.abs(at) <= dateLimit) return { at, years: 0 }
  const cycles = Math.floor((at - cycleStart) / cycleMs)
  return { at: at - cycles * cycleMs, years: 400 * cycles }
}

/**
 * The words of a part of a date, with the years that a move took away from
 * its year. A year before the year 1 gives "BC", such as "283458 BC".
 */
function partWords(part: Intl.DateTimeFormatPart, years: number): string {
  if (part.type !== 'year' || years === 0) return part.value
  const year = Number(part.value) + years
  return year > 0 ? String(year) : `${1 - year} BC`
}

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

/**
 * The day of a shown time as "Mon 30 Nov", with its year when asked, and
 * with the years that a move took away.
 */
function dayWords(
  shown: { at: number; years: number },
  withYear: boolean,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
    timeZone,
  })
    .formatToParts(shown.at)
    .filter((part) => part.type !== 'literal')
    .map((part) => partWords(part, shown.years))
    .join(' ')
}

/**
 * The time of a wake-up in the local time of the reader, on the 24-hour
 * clock: "today at 16:30", "tomorrow at 09:00", "yesterday at 09:00", or
 * its day, such as "Mon 30 Nov at 09:00". A day of another year adds the
 * year, such as "Mon 4 Jan 2027 at 09:00". The words never start a
 * sentence, so they start in lower case. Each safe integer time has words,
 * also past the dates of JavaScript, as `shownTime` says.
 */
export function wakeUpTime(at: number, clock: ReaderClock): string {
  const { timeZone } = clock
  const shown = shownTime(at)
  const day = calendarDay(shown.at, timeZone)
  const today = calendarDay(clock.now, timeZone)
  const moved = shown.years !== 0
  const near = moved ? undefined : nearDay(day.day - today.day)
  const year = moved || day.year !== today.year
  const date = near ?? dayWords(shown, year, timeZone)
  return `${date} at ${clockTime(shown.at, timeZone)}`
}

/**
 * The time of a wake-up in UTC, for a text without a reader, such as a
 * copy and `read_session`, as a copy gives the time of the copy: "24
 * November 2026, 09:00 UTC". Each safe integer time has words, also past
 * the dates of JavaScript, as `shownTime` says.
 */
export function wakeUpTimeUtc(at: number): string {
  const shown = shownTime(at)
  const day = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .formatToParts(shown.at)
    .map((part) => partWords(part, shown.years))
    .join('')
  return `${day}, ${clockTime(shown.at, 'UTC')} UTC`
}

/**
 * @public A pending wake-up, as the end of a copy gives it: its time, in
 * Unix milliseconds, and the text that the agent set.
 */
export interface CopiedWakeUp {
  at: number
  text: string
}

/**
 * @public The end of a copy and of `read_session`: the pending wake-ups of
 * the session, as the chat shows them in its footer, as Markdown. The
 * heading "Pending wake-ups" comes first, at level 2, as the heading of a
 * sender. Then each wake-up gives the title of its card in italics, with
 * its time in UTC, such as "Wake-up 24 November 2026, 09:00 UTC", and the
 * text that the agent set, as a copy gives the text of a message. The
 * soonest comes first, and two at the same time keep their order. With no
 * pending wake-up the text is empty, so the copy ends as before.
 */
export function pendingWakeUpsCopy(wakeUps: readonly CopiedWakeUp[]): string {
  if (wakeUps.length === 0) return ''
  const soonest = [...wakeUps].sort((a, b) => a.at - b.at)
  return [
    `## ${wakeUpWords.region}`,
    ...soonest.flatMap((wakeUp) => [
      `_${pendingWakeUpTitle(wakeUpTimeUtc(wakeUp.at))}_`,
      wakeUp.text,
    ]),
  ].join('\n\n')
}
