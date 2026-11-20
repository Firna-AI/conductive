/** No Markdown address or link title is longer than this many source characters. */
const maxLength = 2000

/** Parentheses in a raw address nest at most this deep. */
const maxParens = 32

/**
 * The target of an inline link: the address with its escapes decoded, the
 * source span of the address inside any angle brackets, and the index
 * after the `)` that ends the link.
 */
interface InlineTarget {
  destination: string
  start: number
  end: number
  next: number
}

/** The end of a raw address: a space, or a `)` outside balanced parentheses. */
function rawEnd(text: string, start: number): number {
  let depth = 0
  for (let index = start; index - start <= maxLength; index += 1) {
    const char = text[index]
    if (char === undefined || /\s/.test(char)) return index
    if (char === '\\') index += 1
    else if (char === '(') {
      depth += 1
      if (depth > maxParens) return -1
    } else if (char === ')') {
      if (depth === 0) return index
      depth -= 1
    }
  }
  return -1
}

/** The unescaped `>` of a valid angle address within its length limit, or -1. */
function angleEnd(text: string, open: number): number {
  for (let index = open + 1; index - open <= maxLength; index += 1) {
    const char = text[index]
    if (char === undefined || char === '\n' || char === '<') return -1
    if (char === '\\') {
      if (text[index + 1] === '\n') return -1
      index += 1
    } else if (char === '>') return index
  }
  return -1
}

/** The first index from `start` that holds no space and no line break. */
function skipSpace(text: string, start: number): number {
  let index = start
  while (index < text.length && /[ \n]/.test(text[index])) index += 1
  return index
}

/** The index after the closing quote of a link title, or -1. */
function titleEnd(text: string, start: number): number {
  const open = text[start]
  const close = open === '(' ? ')' : open
  for (let index = start + 1; index - start <= maxLength; index += 1) {
    const char = text[index]
    if (char === undefined) return -1
    if (char === '\\') index += 1
    else if (char === close) return index + 1
  }
  return -1
}

/**
 * Reads the target of an inline link after its `(`, up to its `)`: the
 * spaces and line breaks around the address, a raw or angle address, and
 * an optional title in quotes or parentheses. The scan stops after a fixed
 * length or depth.
 */
function readInlineTarget(text: string, at: number): InlineTarget | null {
  let index = skipSpace(text, at)
  const angle = text[index] === '<'
  const start = angle ? index + 1 : index
  const end = angle ? angleEnd(text, index) : rawEnd(text, index)
  if (end < 0) return null
  const source = text.slice(start, end)
  index = skipSpace(text, angle ? end + 1 : end)
  if (text[index] === '"' || text[index] === "'" || text[index] === '(') {
    const close = titleEnd(text, index)
    if (close < 0) return null
    index = skipSpace(text, close)
  }
  if (text[index] !== ')') return null
  return {
    destination: source.replace(/\\([!-/:-@[-`{-~])/g, '$1'),
    start,
    end,
    next: index + 1,
  }
}

/** Reads the target of an inline link from `at`, after its `(`, or null. */
export type TargetReader = (at: number) => InlineTarget | null

/**
 * A reader of the inline targets of `text` that stand on one line, as chat
 * text and the message field read them: a line break inside the
 * parentheses makes no target. It reads each target once, because these
 * readers try a link at each `[`, and many `[` can reach the same `(`.
 */
export function lineTargets(text: string): TargetReader {
  const read = new Map<number, InlineTarget | null>()
  return (at) => {
    let target = read.get(at)
    if (target === undefined) {
      const found = readInlineTarget(text, at)
      const oneLine = found && !text.slice(at, found.next).includes('\n')
      target = oneLine ? found : null
      read.set(at, target)
    }
    return target
  }
}
