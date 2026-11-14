import { readMarkdownAddress } from '../../markdown/markdown-destination'

/** No link title in a Markdown file is longer than this many characters. */
const maxLength = 2000

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
 * Reads the address and the optional title of an inline link after its
 * `(`, up to the `)`. The scan stops after a fixed length or depth.
 */
export function readDestination(
  text: string,
  start: number,
): { destination: string; end: number } | null {
  let index = skipSpace(text, start)
  const address = readMarkdownAddress(text, index)
  if (!address) return null
  index = skipSpace(text, address.next)
  if (text[index] === '"' || text[index] === "'" || text[index] === '(') {
    const end = titleEnd(text, index)
    if (end < 0) return null
    index = skipSpace(text, end)
  }
  if (text[index] !== ')') return null
  return { destination: address.destination, end: index + 1 }
}
