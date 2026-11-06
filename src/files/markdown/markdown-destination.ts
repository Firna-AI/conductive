/** No address or title in a Markdown file is longer than this many characters. */
const maxLength = 2000

/**
 * Parentheses in a raw address nest at most this deep, as CommonMark
 * allows, so text with many unclosed links reads quickly.
 */
const maxParens = 32

function skipSpace(text: string, start: number): number {
  let index = start
  while (index < text.length && /[ \n]/.test(text[index])) index += 1
  return index
}

function unescape(text: string): string {
  return text.replace(/\\([!-/:-@[-`{-~])/g, '$1')
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

/**
 * The first `>` after the `<` at `open`, within the length of an address,
 * or -1. The search stops at that length, so text with many `<(` reads in
 * linear time.
 */
function angleEnd(text: string, open: number): number {
  const at = text.slice(open + 1, open + 1 + maxLength).indexOf('>')
  return at < 0 ? -1 : open + 1 + at
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
 * Reads the address and the optional title of an inline link after its
 * `(`, up to the `)`. The scan stops after a fixed length or depth.
 */
export function readDestination(
  text: string,
  start: number,
): { destination: string; end: number } | null {
  let index = skipSpace(text, start)
  let destination: string
  if (text[index] === '<') {
    const close = angleEnd(text, index)
    if (close < 0) return null
    destination = text.slice(index + 1, close)
    if (/[\n<]/.test(destination)) return null
    index = close + 1
  } else {
    const end = rawEnd(text, index)
    if (end < 0) return null
    destination = text.slice(index, end)
    index = end
  }
  index = skipSpace(text, index)
  if (text[index] === '"' || text[index] === "'" || text[index] === '(') {
    const end = titleEnd(text, index)
    if (end < 0) return null
    index = skipSpace(text, end)
  }
  if (text[index] !== ')') return null
  return { destination: unescape(destination), end: index + 1 }
}
