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
    if (/^ .*[^ ].* $/.test(code)) code = code.slice(1, -1)
    spans.set(index, { end: close + length, code })
    index = close + length
  }
  return spans
}

/** The `]` that closes each `[`, skipping escapes and code spans. */
export function bracketPairs(
  text: string,
  spans: ReadonlyMap<number, CodeSpan>,
): Map<number, number> {
  const pairs = new Map<number, number>()
  const open: number[] = []
  for (let index = 0; index < text.length; index += 1) {
    const span = spans.get(index)
    if (span) index = span.end - 1
    else if (text[index] === '\\') index += 1
    else if (text[index] === '[') open.push(index)
    else if (text[index] === ']') {
      const start = open.pop()
      if (start !== undefined) pairs.set(start, index)
    }
  }
  return pairs
}
