const lexeme =
  /\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*"?|'(?:\\[\s\S]|[^'\\])*'?|\\(?:[\da-f]{1,6}[ \t\n]?|[\s\S])|[+-]?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?(?:[a-z][\w-]*|%)?|#?[-_a-z\u0080-\uffff][\w\u0080-\uffff-]*|#[\w-]+|[ \t\n\r\f]+|[\s\S]/gi

export function cssTokens(text: string) {
  return [...text.matchAll(lexeme)].map((match) => ({
    text: match[0],
    offset: match.index,
  }))
}

function space(text: string): boolean {
  return /^[ \t\n\r\f]+$/.test(text)
}

export function withoutComments(text: string): string {
  return cssTokens(text)
    .map((token) => (token.text.startsWith('/*') ? ' ' : token.text))
    .join('')
}

const leadingTrivia = /^(?:[ \t\n\r\f]+|\/\*[\s\S]*?\*\/)*/

export function skipTrivia(text: string): number {
  return text.match(leadingTrivia)?.[0].length ?? 0
}

function closingToken(open: string): string | undefined {
  if (open === '(') return ')'
  if (open === '[') return ']'
  if (open === '{') return '}'
}

/** Splits text at a separator outside brackets, strings, and comments. */
export function splitCss(text: string, separator: ',' | ' '): string[] {
  const parts: string[] = []
  const stack: string[] = []
  let start = 0
  for (const token of cssTokens(text)) {
    if (
      stack.length === 0 &&
      (separator === ' ' ? space(token.text) : token.text === separator)
    ) {
      parts.push(text.slice(start, token.offset))
      start = token.offset + token.text.length
    } else if (token.text === stack.at(-1)) {
      stack.pop()
    } else {
      const close = closingToken(token.text)
      if (close) stack.push(close)
    }
  }
  parts.push(text.slice(start))
  return parts
}

export type SourcePart = {
  text: string
  offset: number
  children?: SourcePart[]
}

/** Reads source blocks and statements. Lightning CSS checks their meaning. */
export function sourceParts(source: string): SourcePart[] {
  const tokens = cssTokens(source)
  let index = 0

  function list(inBlock: boolean): SourcePart[] {
    const parts: SourcePart[] = []
    const stack: string[] = []
    let start: number | undefined

    function add(end: number, children?: SourcePart[]) {
      if (start !== undefined) {
        parts.push({
          text: source.slice(start, end).trimEnd(),
          offset: start,
          children,
        })
      }
      start = undefined
    }

    while (index < tokens.length) {
      const { offset, text } = tokens[index++]
      if (start === undefined && (space(text) || text.startsWith('/*')))
        continue
      if (stack.length === 0) {
        if (text === ';') {
          add(offset)
          continue
        }
        if (text === '}') {
          add(offset)
          if (inBlock) return parts
          parts.push({ text, offset })
          continue
        }
        if (
          text === '{' &&
          !/^--[\w-]+\s*:/.test(
            withoutComments(source.slice(start ?? offset, offset)),
          )
        ) {
          const head = start ?? offset
          const children = list(true)
          parts.push({
            text: source.slice(head, offset).trimEnd(),
            offset: head,
            children,
          })
          start = undefined
          continue
        }
      }
      start ??= offset
      if (text === stack.at(-1)) stack.pop()
      else {
        const close = closingToken(text)
        if (close) stack.push(close)
      }
    }
    add(source.length)
    return parts
  }

  return list(false)
}
