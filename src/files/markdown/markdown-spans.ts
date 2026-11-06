export interface CodeSpan {
  end: number
  code: string
}

export function runLength(text: string, index: number, char: string): number {
  let end = index
  while (text[end] === char) end += 1
  return end - index
}

/** The starts of the whole backtick runs of one length, and a read position. */
interface Runs {
  starts: number[]
  cursor: number
}

/**
 * The closing runs of a text. One pass indexes each whole backtick run by
 * its length, in text order. `next` moves the cursor of one length forward
 * only. Callers ask in text order, so each cursor passes each run once.
 */
function closingRuns(text: string) {
  const byLength = new Map<number, Runs>()
  for (let at = text.indexOf('`'); at >= 0;) {
    const length = runLength(text, at, '`')
    const runs = byLength.get(length)
    if (runs) runs.starts.push(at)
    else byLength.set(length, { starts: [at], cursor: 0 })
    at = text.indexOf('`', at + length)
  }
  return {
    /** The first whole run of exactly `length` backticks from `from`, or -1. */
    next(length: number, from: number): number {
      const runs = byLength.get(length)
      if (!runs) return -1
      const { starts } = runs
      while (runs.cursor < starts.length && starts[runs.cursor] < from) {
        runs.cursor += 1
      }
      return runs.cursor < starts.length ? starts[runs.cursor] : -1
    },
  }
}

function isLineTerminator(char: string): boolean {
  return (
    char === '\n' || char === '\r' || char === '\u2028' || char === '\u2029'
  )
}

/**
 * True when one space pads each end of a code span that holds other text.
 * It gives the result of the test `/^ .*[^ ].* $/` in one pass. A dot
 * matches no line terminator, so one terminator at most can stand between
 * the two spaces, as the one character of `[^ ]`.
 */
function padded(code: string): boolean {
  const last = code.length - 1
  if (last < 2 || code[0] !== ' ' || code[last] !== ' ') return false
  let terminators = 0
  let other = false
  for (let index = 1; index < last; index += 1) {
    const char = code[index]
    if (isLineTerminator(char)) terminators += 1
    else if (char !== ' ') other = true
  }
  return terminators === 1 || (terminators === 0 && other)
}

/**
 * The code spans of a text, by start index. A backslash before an opening
 * run escapes its first backtick. Inside code, a backslash escapes
 * nothing, so it cannot hide a closing run. The scan, the index of the
 * runs, and the closing-run cursors each read the text once, so the work
 * stays linear in its length for any mix of run lengths.
 */
export function codeSpans(text: string): Map<number, CodeSpan> {
  const spans = new Map<number, CodeSpan>()
  const closers = closingRuns(text)
  let index = 0
  while (index < text.length) {
    const char = text[index]
    if (char === '\\') {
      index += 2
      continue
    }
    if (char !== '`') {
      index += 1
      continue
    }
    // The rest of the run from `index`: a whole run, or the run after an
    // escaped backtick. It ends where the whole run ends.
    const length = runLength(text, index, '`')
    const close = closers.next(length, index + length)
    if (close < 0) {
      index += length
      continue
    }
    let code = text.slice(index + length, close).replace(/\n/g, ' ')
    if (padded(code)) code = code.slice(1, -1)
    spans.set(index, { end: close + length, code })
    index = close + length
  }
  return spans
}

export interface BracketPairs {
  /** The `]` that closes each `[`. */
  close: ReadonlyMap<number, number>
  /**
   * The `[` of each pair that holds another pair. Such a pair holds a `]`,
   * and no definition label does, so its text never names a reference.
   */
  holders: ReadonlySet<number>
}

/** The bracket pairs of a text, skipping escapes and code spans. */
export function bracketPairs(
  text: string,
  spans: ReadonlyMap<number, CodeSpan>,
): BracketPairs {
  const close = new Map<number, number>()
  const holders = new Set<number>()
  const open: number[] = []
  for (let index = 0; index < text.length; index += 1) {
    const span = spans.get(index)
    if (span) index = span.end - 1
    else if (text[index] === '\\') index += 1
    else if (text[index] === '[') open.push(index)
    else if (text[index] === ']') {
      const start = open.pop()
      if (start === undefined) continue
      close.set(start, index)
      // The `[` below on the stack opens a pair that holds this one.
      const outer = open[open.length - 1]
      if (outer !== undefined) holders.add(outer)
    }
  }
  return { close, holders }
}
