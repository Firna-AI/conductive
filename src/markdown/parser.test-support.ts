import { parseMarkdownTokens, type ParsedMarkdown } from './parser'

export function inlineValues(source: string) {
  return parseMarkdownTokens(source).tokens.flatMap(
    (token) =>
      token.children?.map(({ type, content }) => [type, content]) ?? [],
  )
}

export function blockText(parsed: ParsedMarkdown): string {
  return parsed.tokens.map((token) => token.content).join('\n')
}
