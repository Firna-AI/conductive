import MarkdownIt, { type Env, type Token } from 'markdown-it'

/** Source lines that reached the parser's block nesting limit. */
export interface DroppedMarkdownLines {
  /** Zero-based line range, with an exclusive end, as in a token's map. */
  map: readonly [number, number]
  /** Insert the source text before this index in the block token array. */
  tokenIndex: number
}

/** Tokens and source lines for an adapter that must keep dropped text. */
export interface ParsedMarkdown {
  tokens: Token[]
  /** Source lines split at LF, CRLF, or CR, for the token maps. */
  lines: readonly string[]
  dropped: readonly DroppedMarkdownLines[]
}

// A list uses two block levels. Keep room for sixteen nested containers.
const maxNesting = 64
const breakTag = /<br *(?:\/ *)?>/iy
const droppedByEnv = new WeakMap<Env, DroppedMarkdownLines[]>()

/** The shared parser for the chat and the Markdown file preview. */
export const markdownParser = new MarkdownIt('commonmark', {
  html: false,
  linkify: false,
  typographer: false,
  maxNesting,
}).enable(['table', 'strikethrough'])

markdownParser.inline.ruler.before('text', 'break_tag', (state, silent) => {
  if (state.src[state.pos] !== '<') return false
  breakTag.lastIndex = state.pos
  const match = breakTag.exec(state.src)
  if (!match || breakTag.lastIndex > state.posMax) return false
  if (!silent) state.push('hardbreak', 'br', 0).markup = match[0]
  state.pos += match[0].length
  return true
})

// Each link keeps the source text after its label in its meta, so a view can
// show a link that it does not open as typed. The tokens stay as they are.
const inlineRules = markdownParser.inline.ruler
const readLink = inlineRules.__rules__[inlineRules.__find__('link')].fn
inlineRules.at('link', (state, silent) => {
  const start = state.pos
  const first = state.tokens.length
  if (!readLink(state, silent)) return false
  if (silent) return true
  const labelEnd = state.md.helpers.parseLinkLabel(state, start, true)
  const open = state.tokens
    .slice(first)
    .find((token) => token.type === 'link_open')
  if (open && labelEnd >= 0) {
    open.meta = { ...open.meta, tail: state.src.slice(labelEnd, state.pos) }
  }
  return true
})

/**
 * The source text of a link after its label, from its `]`, such as
 * `](src/a.ts "A")` or `][ref]`. A view that opens no such link shows it as
 * `[`, its label, and this text. Null for an address in angle brackets.
 */
export function linkTail(token: Token): string | null {
  const tail = token.meta?.tail
  return typeof tail === 'string' ? tail : null
}

const tokenizeBlocks = markdownParser.block.tokenize.bind(markdownParser.block)
markdownParser.block.tokenize = (state, startLine, endLine) => {
  // The block parser skips the remaining lines here without a leaf token.
  // Container maps cover those lines too, so map coverage cannot find them.
  if (state.level >= state.md.options.maxNesting) {
    const line = state.skipEmptyLines(startLine)
    if (line < endLine && state.sCount[line] >= state.blkIndent) {
      droppedByEnv.get(state.env)?.push({
        map: [line, endLine],
        tokenIndex: state.tokens.length,
      })
    }
  }
  tokenizeBlocks(state, startLine, endLine)
}

/**
 * Parses blocks and exposes source ranges that need a text fallback.
 * Insert `lines.slice(...range.map)` before `tokens[range.tokenIndex]`.
 */
export function parseMarkdownTokens(source: string): ParsedMarkdown {
  const env: Env = {}
  const dropped: DroppedMarkdownLines[] = []
  droppedByEnv.set(env, dropped)
  return {
    tokens: markdownParser.parse(source, env),
    lines: source.split(/\r\n?|\n/),
    dropped,
  }
}
