/**
 * The delimiter runs of emphasis, and their pairs, by the rules of
 * CommonMark 0.31.2: https://spec.commonmark.org/0.31.2/#emphasis-and-strong-emphasis
 * A run is a sequence of `*` or of `_`. The characters next to it decide
 * whether it can open or close emphasis.
 */

/** The characters next to the edges of a text, as its runs see them. */
export interface Edges {
  /** The character before the text, or '' for the start of a line. */
  before: string
  /** The character after the text, or '' for the end of a line. */
  after: string
}

/** A run of `*` or `_` that can open or close emphasis. */
export interface DelimiterRun {
  readonly char: string
  /** The length of the whole run, for the rule of 3. */
  readonly length: number
  readonly canOpen: boolean
  readonly canClose: boolean
  /** The markers that no pair took. They show as text. */
  remaining: number
  /** The number of pairs that this run closes. */
  closes: number
  /** The markers of each pair that this run opens, from the innermost. */
  readonly opens: number[]
}

const whitespace = /^[\t\n\f\r\p{Zs}]$/u
const punctuation = /^[\p{P}\p{S}]$/u

/** The kind of one character next to a run. A line edge counts as whitespace. */
type Side = 'space' | 'punctuation' | 'other'

function sideOf(char: string): Side {
  if (char === '' || whitespace.test(char)) return 'space'
  return punctuation.test(char) ? 'punctuation' : 'other'
}

function isHigh(code: number): boolean {
  return code >= 0xd800 && code < 0xdc00
}

function isLow(code: number): boolean {
  return code >= 0xdc00 && code < 0xe000
}

/** The whole code point that ends at `end`. */
function pointBefore(text: string, end: number): string {
  const pair =
    end >= 2 &&
    isLow(text.charCodeAt(end - 1)) &&
    isHigh(text.charCodeAt(end - 2))
  return text.slice(pair ? end - 2 : end - 1, end)
}

/** The whole code point that starts at `start`. */
function pointAt(text: string, start: number): string {
  const pair =
    isHigh(text.charCodeAt(start)) && isLow(text.charCodeAt(start + 1))
  return text.slice(start, pair ? start + 2 : start + 1)
}

/**
 * The run of `*` or `_` from `start` to `end`, or null when it can neither
 * open nor close. A left-flanking run can open and a right-flanking run can
 * close. An `_` inside a word does neither, unless punctuation stands on
 * the other side.
 */
export function delimiterRun(
  text: string,
  start: number,
  end: number,
  edges: Edges,
): DelimiterRun | null {
  const char = text[start]
  const before = sideOf(start === 0 ? edges.before : pointBefore(text, start))
  const after = sideOf(end === text.length ? edges.after : pointAt(text, end))
  const left = after !== 'space' && (after === 'other' || before !== 'other')
  const right = before !== 'space' && (before === 'other' || after !== 'other')
  const underscore = char === '_'
  const canOpen = left && (!underscore || !right || before === 'punctuation')
  const canClose = right && (!underscore || !left || after === 'punctuation')
  if (!canOpen && !canClose) return null
  const length = end - start
  return {
    char,
    length,
    canOpen,
    canClose,
    remaining: length,
    closes: 0,
    opens: [],
  }
}

/**
 * Whether the earlier run `opener` can pair with `closer`. The rule of 3:
 * when either run can both open and close, their lengths may not add up to
 * a multiple of 3, unless both lengths are multiples of 3.
 */
function matches(opener: DelimiterRun, closer: DelimiterRun): boolean {
  if (!opener.canOpen || opener.char !== closer.char) return false
  if (!closer.canOpen && !opener.canClose) return true
  const sum = opener.length + closer.length
  return sum % 3 !== 0 || closer.length % 3 === 0
}

/**
 * The kind of a closer, for its search floor. Closers of one kind match
 * the same openers, by the character, the rule of 3, and whether they can
 * also open.
 */
function kindOf(closer: DelimiterRun): number {
  const base = closer.char === '*' ? 0 : 6
  return base + (closer.canOpen ? 3 : 0) + (closer.length % 3)
}

/** Records one pair: two markers for strong emphasis when both runs have two. */
function pair(opener: DelimiterRun, closer: DelimiterRun): void {
  const size = opener.remaining >= 2 && closer.remaining >= 2 ? 2 : 1
  opener.remaining -= size
  closer.remaining -= size
  opener.opens.push(size)
  closer.closes += 1
}

/**
 * Pairs the runs of one text, in text order, with the delimiter stack of
 * CommonMark. Each closer takes the nearest earlier opener that matches,
 * until it has no markers left or finds no opener. The runs between a
 * pair can pair no more, so pairs nest and never cross.
 *
 * The work is linear in the number of runs. A pair unlinks the runs that
 * its search passed. A closer that finds no opener raises the search floor
 * of its kind, so no later closer of that kind reads those runs again.
 */
export function pairRuns(runs: readonly DelimiterRun[]): void {
  const count = runs.length
  // The runs that can still pair, as a list linked by index.
  const prev = Array.from({ length: count }, (_, index) => index - 1)
  const next = Array.from({ length: count }, (_, index) => index + 1)
  const unlink = (index: number) => {
    if (prev[index] >= 0) next[prev[index]] = next[index]
    if (next[index] < count) prev[next[index]] = prev[index]
  }
  // The highest index that each kind of closer no longer searches.
  const floors = new Array<number>(12).fill(-1)
  let closer = 0
  while (closer < count) {
    const run = runs[closer]
    if (!run.canClose) {
      closer = next[closer]
      continue
    }
    const kind = kindOf(run)
    let opener = prev[closer]
    while (opener > floors[kind] && !matches(runs[opener], run)) {
      opener = prev[opener]
    }
    if (opener <= floors[kind]) {
      // No run up to this closer opens for its kind. A run that cannot
      // open either shows as text.
      floors[kind] = closer - 1
      const after = next[closer]
      if (!run.canOpen) unlink(closer)
      closer = after
      continue
    }
    pair(runs[opener], run)
    // The runs between the pair leave the list.
    next[opener] = closer
    prev[closer] = opener
    if (runs[opener].remaining === 0) unlink(opener)
    if (run.remaining === 0) {
      const after = next[closer]
      unlink(closer)
      closer = after
    }
  }
}
