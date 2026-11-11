import { NativeHistoryError } from './providers/native-history'

/** Locate one JSON string value without rewriting any other source byte. */
export function codexHeader(line: Buffer): Buffer {
  const text = line.toString('utf8')
  if (!Buffer.from(text).equals(line)) throw new NativeHistoryError()
  const header: unknown = JSON.parse(text)
  if (
    typeof header !== 'object' ||
    header === null ||
    !('type' in header) ||
    header.type !== 'session_meta'
  )
    throw new NativeHistoryError()
  if (
    !('payload' in header) ||
    typeof header.payload !== 'object' ||
    header.payload === null ||
    !('model_provider' in header.payload) ||
    header.payload.model_provider !== 'openai'
  )
    return line
  let position = 0
  let replacement: { start: number; end: number } | undefined
  const space = () => {
    while (/\s/u.test(text[position] ?? '') && position < text.length)
      position++
  }
  function token(): { start: number; end: number; value: string } {
    space()
    const start = position++
    while (position < text.length) {
      const character = text[position++]
      if (character === '\\') position++
      else if (character === '"') break
    }
    return {
      start,
      end: position,
      value: JSON.parse(text.slice(start, position)),
    }
  }
  function value(path: string[]): void {
    space()
    if (text[position] === '{') {
      position++
      space()
      while (text[position] !== '}') {
        const key = token().value
        space()
        position++
        value([...path, key])
        space()
        if (text[position] !== ',') break
        position++
      }
      position++
    } else if (text[position] === '[') {
      position++
      space()
      while (text[position] !== ']') {
        value([...path, '[]'])
        space()
        if (text[position] !== ',') break
        position++
      }
      position++
    } else if (text[position] === '"') {
      const part = token()
      if (
        path.length === 2 &&
        path[0] === 'payload' &&
        path[1] === 'model_provider' &&
        part.value === 'openai'
      )
        replacement = part
    } else {
      while (position < text.length && !/[\s,}\]]/u.test(text[position]))
        position++
    }
  }
  value([])
  if (!replacement) return line
  return Buffer.from(
    text.slice(0, replacement.start) +
      '"conductive"' +
      text.slice(replacement.end),
  )
}
