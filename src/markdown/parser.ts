import MarkdownIt, { type Env, type Token } from 'markdown-it'
import { limitBlockDepth } from './block-depth'
import { joinEmptyItemLists } from './empty-item-lists'
import { limitInlineDepth } from './inline-depth'
import { sparseTable } from './table-rule'
import { bareAddressAt, webAddressStartAt } from './web-links'

/** Per-parse rules that the adapters add to the shared reader. */
export interface MarkdownOptions {
  /** Keeps bare web addresses intact before the chat reads their links. */
  chat?: boolean
  /** The maximum empty cells that tables may add across the whole file. */
  tableBudget?: number
}

/** Tokens and source lines for the two Markdown adapters. */
export interface ParsedMarkdown {
  tokens: Token[]
  /** Source lines split at LF, CRLF, or CR, for the token maps. */
  lines: readonly string[]
  /** The original source line where the file's literal tail starts. */
  tailLine: number | null
  /** The reference definitions of the message, for a second inline read. */
  references: Env['references']
}

/** Lists and quotes deeper than this show their source as paragraph text. */
export const maxDepth = 16

// A list uses two block levels. Keep room beyond the views' limit.
const maxNesting = maxDepth * 4
const breakTag = /<br *(?:\/ *)?>/iy

/** The shared parser for the chat and the Markdown file preview. */
export const markdownParser = new MarkdownIt('commonmark', {
  html: false,
  linkify: false,
  typographer: false,
  maxNesting,
}).enable(['table', 'strikethrough'])

markdownParser.core.ruler.after('inline', 'inline_depth', limitInlineDepth)
const blockRules = markdownParser.block.ruler
// Read lists, quotes, and headings before a table can take their marks.
blockRules.__rules__.splice(blockRules.__find__('table'), 1)
blockRules.after('heading', 'table', sparseTable, {
  alt: ['paragraph', 'reference'],
})
limitBlockDepth(markdownParser, maxDepth)

markdownParser.core.ruler.after('block', 'table_budget', (state) => {
  const tail = state.env.tableTailLine
  if (typeof tail !== 'number') return
  const budget = state.env.tableBudget
  state.src = state.src.split('\n').slice(0, tail).join('\n')
  // Rebuild the prefix before reference resolution and inline parsing.
  state.env = { tableCellsLeft: budget, chat: state.env.chat }
  state.tokens = []
  state.md.block.parse(state.src, state.md, state.env, state.tokens)
})
markdownParser.core.ruler.after(
  'table_budget',
  'empty_item_lists',
  joinEmptyItemLists,
)

markdownParser.inline.ruler.before('text', 'break_tag', (state, silent) => {
  if (state.src[state.pos] !== '<') return false
  breakTag.lastIndex = state.pos
  const match = breakTag.exec(state.src)
  if (!match || breakTag.lastIndex > state.posMax) return false
  if (!silent) state.push('hardbreak', 'br', 0).markup = match[0]
  state.pos += match[0].length
  return true
})

markdownParser.inline.ruler.after('text', 'bare_address', (state, silent) => {
  if (
    silent ||
    state.env.chat !== true ||
    state.linkLevel > 0 ||
    !state.src.startsWith('://', state.pos)
  )
    return false
  const scheme =
    state.pending.length >= 5 &&
    webAddressStartAt(state.src, state.pos - 5) !== null
      ? 5
      : state.pending.length >= 4 &&
          webAddressStartAt(state.src, state.pos - 4) !== null
        ? 4
        : 0
  if (scheme === 0) return false
  const address = bareAddressAt(state.src, state.pos - scheme)
  if (
    !address ||
    address.length <= scheme + 3 ||
    state.pos - scheme + address.length > state.posMax
  )
    return false
  state.pending += address.slice(scheme)
  state.pos += address.length - scheme
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

const readImage = inlineRules.__rules__[inlineRules.__find__('image')].fn
inlineRules.at('image', (state, silent) => {
  const start = state.pos
  if (!readImage(state, silent)) return false
  const image = state.tokens.at(-1)
  if (!silent && image?.type === 'image') {
    image.meta = { ...image.meta, source: state.src.slice(start, state.pos) }
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

/**
 * The source text of an image token, as the text wrote it, such as
 * `![Login](shots/login.png)`. A copy of a picture in the chat gives it.
 */
export function imageSource(token: Token): string {
  const source = token.meta?.source
  return typeof source === 'string' ? source : token.content
}

/** Parses blocks, keeping the original source lines for depth and table tails. */
export function parseMarkdownTokens(
  source: string,
  options: MarkdownOptions = {},
): ParsedMarkdown {
  const env: Env = { ...options, tableCellsLeft: options.tableBudget }
  return {
    tokens: markdownParser.parse(source, env),
    lines: source.split(/\r\n?|\n/),
    tailLine: typeof env.tableTailLine === 'number' ? env.tableTailLine : null,
    references: env.references,
  }
}
