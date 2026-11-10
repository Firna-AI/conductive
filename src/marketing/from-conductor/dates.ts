export const conductorCloudDays = {
  readOnly: '2026-11-13',
  shutDown: '2026-11-20',
} as const

export const conductorAnnouncementHref =
  'https://www.conductor.build/announcement'

export const dueRule =
  'A due date is a recorded delivery commitment. Without one, an In progress or Planned row shows “No date yet”.'

const longDay = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const shortDay = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function dayWords(day: string, length: 'long' | 'short'): string {
  const time = Date.parse(`${day}T00:00:00Z`)
  if (Number.isNaN(time)) return day
  return (length === 'long' ? longDay : shortDay).format(time)
}

const clock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})

/** A time in UTC, as `YYYY-MM-DDTHH:MMZ`. */
const utcTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/

/**
 * The words of a time in UTC, such as "9 November 2026 at 19:17 UTC". A
 * value in another form, or one that does not parse, stays as it is, so the
 * words never give the time of another zone as UTC.
 */
export function timeWords(time: string): string {
  const moment = utcTime.test(time) ? Date.parse(time) : Number.NaN
  if (Number.isNaN(moment)) return time
  return `${longDay.format(moment)} at ${clock.format(moment)} UTC`
}
