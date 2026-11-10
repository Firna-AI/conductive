/** A count as the section writes it, with a comma in each thousand: 1,284. */
export function formatCount(value: number): string {
  return value.toLocaleString('en')
}

/** A count and its noun: "1 org", or "312 orgs". */
export function counted(value: number, one: string, many: string): string {
  return `${formatCount(value)} ${value === 1 ? one : many}`
}

function yearOf(time: number, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone }).format(
    time,
  )
}

/** The time of a day: 14:32. */
export function formatClock(time: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(time)
}

/** A day in a list or a sentence: 8 Nov, or 8 Nov 2025 in another year. */
export function formatShortDay(
  time: number,
  now: number,
  timeZone?: string,
): string {
  const sameYear = yearOf(time, timeZone) === yearOf(now, timeZone)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
    timeZone,
  }).format(time)
}

/** A day with its year, as the details of a page give it: 28 Oct 2026. */
export function formatLongDay(time: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(time)
}

/** A moment in a sentence: 8 Nov at 14:35. */
export function formatMoment(
  time: number,
  now: number,
  timeZone?: string,
): string {
  return `${formatShortDay(time, now, timeZone)} at ${formatClock(time, timeZone)}`
}

/** A time with its year, as a row of the details gives it: 8 Nov 2026 at 15:04. */
export function formatLongMoment(time: number, timeZone?: string): string {
  return `${formatLongDay(time, timeZone)} at ${formatClock(time, timeZone)}`
}

const DAY = 86_400_000

/**
 * How long a GitHub account has existed, in its largest whole unit: 2 days,
 * 3 weeks, 5 months, or 9 years. An account of less than a day says so.
 * The operator judges a new person from it.
 */
export function formatAge(createdAt: number, now: number): string {
  const days = Math.floor((now - createdAt) / DAY)
  if (days < 1) return 'Under a day'
  if (days < 14) return days === 1 ? '1 day' : `${days} days`
  if (days < 61) return `${Math.floor(days / 7)} weeks`
  if (days < 365) return `${Math.floor(days / 30.4375)} months`
  const years = Math.floor(days / 365.25)
  return years === 1 ? '1 year' : `${years} years`
}
