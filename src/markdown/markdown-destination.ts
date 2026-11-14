/** No Markdown address is longer than this many source characters. */
const maxLength = 2000

/** Parentheses in a raw address nest at most this deep. */
const maxParens = 32

/** The decoded address, its source span, and the index after its angle brackets. */
interface MarkdownAddress {
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

/** The first `>` within the address length limit, or -1. */
function angleEnd(text: string, open: number): number {
  const at = text.slice(open + 1, open + 1 + maxLength).indexOf('>')
  return at < 0 ? -1 : open + 1 + at
}

/** Reads a raw or angle address, without spaces around it or a link title. */
export function readMarkdownAddress(
  text: string,
  at: number,
): MarkdownAddress | null {
  const angle = text[at] === '<'
  const start = angle ? at + 1 : at
  const end = angle ? angleEnd(text, at) : rawEnd(text, at)
  if (end < 0) return null
  const source = text.slice(start, end)
  if (angle && /[\n<]/.test(source)) return null
  return {
    destination: source.replace(/\\([!-/:-@[-`{-~])/g, '$1'),
    start,
    end,
    next: angle ? end + 1 : end,
  }
}
