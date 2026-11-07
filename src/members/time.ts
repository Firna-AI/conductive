const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** A deleted org waits 7 days before everything is deleted (decision 30). */
export const RESTORE_DAYS = 7

function plural(total: number, unit: string): string {
  return `${total} ${unit}${total === 1 ? '' : 's'}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** The local year and day number, independent of changes to the clock. */
function calendarDay(
  at: number,
  timeZone: string | undefined,
): { dayNumber: number; year: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).formatToParts(at)
  const value = (type: 'year' | 'month' | 'day'): number =>
    Number(parts.find((part) => part.type === type)?.value)
  const year = value('year')
  return {
    dayNumber: Date.UTC(year, value('month') - 1, value('day')) / DAY,
    year,
  }
}

/** The length of a build, such as "41s", "6m 02s", or "1h 05m". */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.round(milliseconds / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${pad(seconds % 60)}s`
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`
}

/** How long ago an invite went out, such as "2 days ago". */
export function inviteAge(createdAt: number, now: number): string {
  const elapsed = Math.max(0, now - createdAt)
  if (elapsed < MINUTE) return 'just now'
  if (elapsed < HOUR)
    return `${plural(Math.floor(elapsed / MINUTE), 'minute')} ago`
  if (elapsed < DAY) return `${plural(Math.floor(elapsed / HOUR), 'hour')} ago`
  return `${plural(Math.floor(elapsed / DAY), 'day')} ago`
}

/**
 * When a build ran: "12 minutes ago" and "8 hours ago" within a day, then
 * "Yesterday", then the date, such as "3 Nov". `timeZone` is the browser's
 * time zone when it is absent.
 */
export function buildTime(at: number, now: number, timeZone?: string): string {
  const elapsed = Math.max(0, now - at)
  if (elapsed < MINUTE) return 'Just now'
  if (elapsed < HOUR)
    return `${plural(Math.floor(elapsed / MINUTE), 'minute')} ago`
  if (elapsed < DAY) return `${plural(Math.floor(elapsed / HOUR), 'hour')} ago`
  const atDay = calendarDay(at, timeZone)
  const nowDay = calendarDay(now, timeZone)
  if (nowDay.dayNumber - atDay.dayNumber === 1) {
    return 'Yesterday'
  }
  const sameYear = atDay.year === nowDay.year
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
    timeZone,
  }).format(at)
}

/** The day when a deleted org loses everything, such as "12 November". */
export function deletionDay(deletesAt: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(deletesAt)
}

/** The time when an org that an admin deletes now loses everything. */
export function deletionTime(now: number): number {
  return now + RESTORE_DAYS * DAY
}
