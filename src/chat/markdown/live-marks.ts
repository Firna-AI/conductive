import type { Delimiter, Env, StateInline, Token } from 'markdown-it'
import { markdownParser } from '../../markdown/parser'

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
 * The inline tokens of the text of one block, as the parser reads them, with
 * each open mark closed at the end of the text. Null when the text has no
 * open mark: the block then keeps the tokens of the parse. `references` are
 * the reference definitions of the whole message, so a reference link reads
 * as it does in the parse of the message.
 */
export function closedMarks(
  content: string,
  references: Env['references'],
): Token[] | null {
  const md = markdownParser
  const env: Env = { chat: true, references }
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
