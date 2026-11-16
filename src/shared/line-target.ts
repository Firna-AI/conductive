/** A line or a range of lines of a file, from 1. `end` is never before `start`. */
export interface LineRange {
  start: number
  end: number
}

/** The most digits of a line number, so a long run of digits stays text. */
const DIGITS = '([1-9][0-9]{0,6})'

/**
 * The line target at the end of a path: `:N`, `:N-M`, `:N:C`, `#LN`,
 * `#LN-LM`, or `#LNCC`. A column is read and dropped.
 */
const TARGET = new RegExp(
  `(?::${DIGITS}(?:-${DIGITS}|:[0-9]+)?|#L${DIGITS}(?:C[0-9]+)?(?:-L${DIGITS}(?:C[0-9]+)?)?)$`,
  'u',
)

/** The range from two numbers, or null when the end comes before the start. */
function rangeOf(start: string, end: string | undefined): LineRange | null {
  const first = Number(start)
  const last = end === undefined ? first : Number(end)
  return last < first ? null : { start: first, end: last }
}

/**
 * Splits the line target off the end of a path, such as `src/app.ts:42`.
 * A path without a target, or with a range that ends before it starts,
 * gives the whole text and no lines.
 */
export function splitLineTarget(text: string): {
  path: string
  lines: LineRange | null
} {
  const match = TARGET.exec(text)
  if (!match || match.index === 0) return { path: text, lines: null }
  const [, colonStart, colonEnd, hashStart, hashEnd] = match
  const lines =
    colonStart === undefined
      ? rangeOf(hashStart, hashEnd)
      : rangeOf(colonStart, colonEnd)
  if (!lines) return { path: text, lines: null }
  return { path: text.slice(0, match.index), lines }
}

/** The text of a range, such as `42` or `42-50`. */
export function lineLabel(lines: LineRange): string {
  return lines.start === lines.end
    ? String(lines.start)
    : `${lines.start}-${lines.end}`
}

/** Reads the text of `lineLabel`, or null for any other text. */
export function readLineLabel(value: string | null): LineRange | null {
  if (value === null) return null
  const match = new RegExp(`^${DIGITS}(?:-${DIGITS})?$`, 'u').exec(value)
  return match ? rangeOf(match[1], match[2]) : null
}
