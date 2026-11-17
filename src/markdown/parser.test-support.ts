import { parseMarkdownTokens, type ParsedMarkdown } from './parser'

export function inlineValues(source: string) {
  return parseMarkdownTokens(source).tokens.flatMap(
    (token) =>
      token.children?.map(({ type, content }) => [type, content]) ?? [],
  )
}

export function textWithFallback(parsed: ParsedMarkdown): string {
  const parts: string[] = []
  for (let index = 0; index <= parsed.tokens.length; index += 1) {
    for (const range of parsed.dropped) {
      if (range.tokenIndex === index) {
        parts.push(parsed.lines.slice(...range.map).join('\n'))
      }
    }
    const token = parsed.tokens[index]
    if (token?.type === 'inline') parts.push(token.content)
  }
  return parts.join('\n')
}
