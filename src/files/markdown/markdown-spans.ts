export interface CodeSpan {
  end: number
  code: string
}

export function runLength(text: string, index: number, char: string): number {
  let end = index
  while (text[end] === char) end += 1
  return end - index
}

/** The next run of exactly `length` backticks from `from`, or -1. */
function closingRun(text: string, length: number, from: number): number {
  for (let at = text.indexOf('`', from); at >= 0;) {
    const run = runLength(text, at, '`')
    if (run === length) return at
    at = text.indexOf('`', at + run)
  }
  return -1
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
 * The code spans of a text, by start index. A run of backticks without a
 * closing run of the same length is cached, so the scan stays linear.
 */
export function codeSpans(text: string): Map<number, CodeSpan> {
  const spans = new Map<number, CodeSpan>()
  const closerless = new Map<number, number>()
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
    const length = runLength(text, index, '`')
    const missing = (closerless.get(length) ?? Infinity) <= index
    const close = missing ? -1 : closingRun(text, length, index + length)
    if (close < 0) {
      if (!missing) closerless.set(length, index)
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
