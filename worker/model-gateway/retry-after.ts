const months = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'
const clock = '(\\d{2}):(\\d{2}):(\\d{2})'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Codex reads no delay above the largest signed 64-bit number. */
const lastDelaySecond = 9_223_372_036_854_775_807n

interface DateParts {
  weekday: string
  year: number
  month: string
  day: number
  hour: number
  minute: number
  second: number
}

/** The three HTTP date forms: IMF-fixdate, RFC 850, and asctime. */
const forms: readonly {
  pattern: RegExp
  parts(match: RegExpExecArray): DateParts
}[] = [
  {
    pattern: new RegExp(
      `^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\\d{2}) (${months}) (\\d{4}) ${clock} GMT$`,
    ),
    parts: ([, weekday, day, month, year, hour, minute, second]) => ({
      weekday,
      year: Number(year),
      month,
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    }),
  },
  {
    pattern: new RegExp(
      `^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\\d{2})-(${months})-(\\d{2}) ${clock} GMT$`,
    ),
    parts: ([, weekday, day, month, year, hour, minute, second]) => ({
      weekday: weekday.slice(0, 3),
      year: (Number(year) < 70 ? 2000 : 1900) + Number(year),
      month,
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    }),
  },
  {
    pattern: new RegExp(
      `^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (${months}) ( \\d|\\d{2}) ${clock} (\\d{4})$`,
    ),
    parts: ([, weekday, month, day, hour, minute, second, year]) => ({
      weekday,
      year: Number(year),
      month,
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    }),
  },
]

/** Returns the time of an HTTP date in milliseconds, or null. */
function httpDate(text: string): number | null {
  for (const { pattern, parts } of forms) {
    const match = pattern.exec(text)
    if (!match) continue
    const { weekday, year, month, day, hour, minute, second } = parts(match)
    const time = Date.UTC(
      year,
      months.split('|').indexOf(month),
      day,
      hour,
      minute,
      second,
    )
    const date = new Date(time)
    const real =
      weekdays[date.getUTCDay()] === weekday &&
      date.getUTCDate() === day &&
      date.getUTCHours() === hour &&
      date.getUTCMinutes() === minute &&
      date.getUTCSeconds() === second
    return real ? time : null
  }
  return null
}

/**
 * Reads the wait of `retry-after` in seconds, from delay seconds or an HTTP
 * date, as Codex reads it. Any other value gives null.
 */
export function retryAfterSeconds(
  value: string | null,
  now: number,
): number | null {
  const text = value?.trim() ?? ''
  if (/^\d+$/.test(text))
    return BigInt(text) > lastDelaySecond ? null : Number(text)
  const time = httpDate(text)
  return time === null ? null : Math.max(0, (time - now) / 1000)
}
