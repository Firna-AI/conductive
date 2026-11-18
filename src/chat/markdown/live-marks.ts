import type { Delimiter, Env, StateInline, Token } from 'markdown-it'
import { linkTail, markdownParser } from '../../markdown/parser'

/**
 * The open marks of text that the agent still writes, as "While the agent
 * writes" of `chat-markdown.md` says, from item 9 C of the Markdown parser
 * plan. The parser reads each mark as CommonMark does. This module reads the
 * inline text of one block again with the rules of the parser, and closes
 * each open mark at its end. The parser and its output stay as they are.
 */

/** The `~` of strikethrough, which marks its run with two characters. */
const tilde = 0x7e

/** A rule of a chain of the parser, with its name. */
interface Rule<Args extends unknown[]> {
  name: string
  enabled: boolean
  fn: (...args: Args) => unknown
}

/** The rules of a chain that run, in their order. */
function running<Args extends unknown[]>(rules: Rule<Args>[]): Rule<Args>[] {
  return rules.filter((rule) => rule.enabled)
}

/**
 * Whether each delimiter stands between a pair of marks. CommonMark takes
 * such a mark out of the run of pairs, so no later mark can pair it.
 */
function betweenPairs(delimiters: readonly Delimiter[]): boolean[] {
  const steps = Array<number>(delimiters.length + 1).fill(0)
  delimiters.forEach((delimiter, index) => {
    if (delimiter.end < 0) return
    steps[index + 1] += 1
    steps[delimiter.end] -= 1
  })
  let pairs = 0
  return delimiters.map((_, index) => {
    pairs += steps[index]
    return pairs > 0
  })
}

/**
 * Closes each open mark of the text at its end, the last mark first, so an
 * earlier mark holds a later one. An open mark can open and cannot close,
 * has no pair, and stands outside each pair and each link. Its closing mark
 * pairs with it as a closing mark of the same run would. Gives false when
 * the text has no open mark.
 */
function closeOpenMarks(state: StateInline): boolean {
  const { delimiters } = state
  const between = betweenPairs(delimiters)
  const open = delimiters.filter(
    (delimiter, index) =>
      delimiter.open &&
      !delimiter.close &&
      delimiter.end < 0 &&
      !between[index],
  )
  for (const opener of open.toReversed()) {
    const mark = state.push('text', '', 0)
    mark.content = String.fromCharCode(opener.marker).repeat(
      opener.marker === tilde ? 2 : 1,
    )
    opener.end = delimiters.length
    delimiters.push({
      ...opener,
      token: state.tokens.length - 1,
      end: -1,
      open: false,
      close: true,
    })
  }
  return open.length > 0
}

/**
 * Whether the tokens read a reference link or image. The inline read of one
 * block has none of the reference definitions of the message, so it could
 * not read them again.
 */
function readsReference(tokens: readonly Token[]): boolean {
  return tokens.some((token) => {
    if (token.type === 'link_open') {
      const tail = linkTail(token)
      return tail !== null && !tail.startsWith('](')
    }
    if (token.type !== 'image') return false
    const source = token.meta?.source
    if (typeof source === 'string' && !source.endsWith(')')) return true
    return readsReference(token.children ?? [])
  })
}

/**
 * The inline tokens of the text of one block, as the parser reads them, with
 * each open mark closed at the end of the text. `parsed` holds the tokens of
 * the parse of the whole message. Null when the text has no open mark, or
 * when it reads a reference link, which the block alone cannot read: the
 * block then keeps the tokens of the parse.
 */
export function closedMarks(
  content: string,
  parsed: readonly Token[],
): Token[] | null {
  if (readsReference(parsed)) return null
  const md = markdownParser
  const env: Env = { chat: true }
  const state = new md.inline.State(content, md, env, [])
  md.inline.tokenize(state)
  const post = running(md.inline.ruler2.__rules__)
  const pairs = post.findIndex((rule) => rule.name === 'balance_pairs') + 1
  for (const rule of post.slice(0, pairs)) rule.fn(state)
  if (!closeOpenMarks(state)) return null
  for (const rule of post.slice(pairs)) rule.fn(state)
  // The core rules after the inline parse, such as the depth limit of marks.
  const core = new md.core.State(content, md, env)
  const inline = new core.Token('inline', '', 0)
  inline.content = content
  inline.children = state.tokens
  core.tokens = [inline]
  const rules = md.core.ruler.__rules__
  const after = rules.findIndex((rule) => rule.name === 'inline') + 1
  for (const rule of running(rules.slice(after))) rule.fn(core)
  return inline.children
}
