import { bareAddressAt, markdownTargetAt } from '../../markdown/web-links'
import { mentionAt, type Mention } from '../../shared/mention-text'

/** A Markdown link: its label, and the text around its address as typed. */
export interface MarkdownLink {
  /** The text between the brackets. */
  label: string
  /** The text before the address, such as `[docs](` or `[docs](<`. */
  before: string
  /** The text after the address: `)`, or `>)`. */
  after: string
  /** A `!` stands before it, so it is the Markdown of an image. */
  image: boolean
}

/** A web address of chat text, bare or in a Markdown link. */
export interface LinkToken {
  kind: 'link'
  href: string
  source: string
  markdown: MarkdownLink | null
}

/** A token of chat text, before the list of the org names its links. */
export type Token =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'mark' }
  | LinkToken
  | { kind: 'mention'; mention: Mention }

/** What a reading of chat text looks for, besides code. */
interface Reading {
  /** `**` marks bold, as in an answer. */
  marks: boolean
  /** Links count. A text that shows as typed reads again without them. */
  links: boolean
  /**
   * Whether a mention counts, as in a message of a member. The `@` of each
   * other mention reads as plain text.
   */
  mentions: (mention: Mention) => boolean
}

/**
 * The Markdown link whose `[` stands at `at`, or null. Its label ends at the
 * first `]` outside code, on the same line, and its target follows at once.
 * So a label can hold code or bold.
 */
function markdownLinkAt(text: string, at: number): LinkToken | null {
  let code = false
  for (let index = at + 1; index < text.length; index += 1) {
    const char = text[index]
    if (char === '\n') return null
    if (char === '`') code = !code
    else if (char === ']' && !code) {
      const target = markdownTargetAt(text, index + 1)
      if (!target) return null
      const end = index + 1 + target.length
      // The parentheses hold `<` before the address, or nothing.
      const parens = text.slice(index + 1, end)
      const start = parens.indexOf(target.href)
      return {
        kind: 'link',
        href: target.href,
        source: text.slice(at, end),
        markdown: {
          label: text.slice(at + 1, index),
          before: text.slice(at, index + 1 + start),
          after: parens.slice(start + target.href.length),
          image: text[at - 1] === '!',
        },
      }
    }
  }
  return null
}

/**
 * The bare web address at `at`, or null. Where `**` marks bold, the address
 * ends before the next mark, so bold around the address stays bold.
 */
function bareAddressTokenAt(
  text: string,
  at: number,
  marks: boolean,
): LinkToken | null {
  const mark = marks ? text.indexOf('**', at) : -1
  const href = bareAddressAt(mark === -1 ? text : text.slice(0, mark), at)
  return href ? { kind: 'link', href, source: href, markdown: null } : null
}

/**
 * The tokens of a chat text, from left to right. A backtick starts code,
 * which runs to the next backtick, or to the end of the text. Outside code,
 * a Markdown link, a bare web address, and a `**` mark each start where
 * they stand, so code and bold in a link label stay in the link.
 */
export function tokens(text: string, reading: Reading): Token[] {
  const found: Token[] = []
  let plain = ''
  const add = (token: Token, length: number) => {
    if (plain !== '') found.push({ kind: 'text', text: plain })
    plain = ''
    found.push(token)
    return length
  }
  let index = 0
  while (index < text.length) {
    if (text[index] === '`') {
      const end = text.indexOf('`', index + 1)
      const close = end === -1 ? text.length : end
      const code = text.slice(index + 1, close)
      index += add({ kind: 'code', text: code }, close + 1 - index)
      continue
    }
    if (reading.marks && text.startsWith('**', index)) {
      index += add({ kind: 'mark' }, 2)
      continue
    }
    const mention = mentionAt(text, index)
    if (mention && reading.mentions(mention)) {
      index += add({ kind: 'mention', mention }, mention.source.length)
      continue
    }
    const link = !reading.links
      ? null
      : text[index] === '['
        ? markdownLinkAt(text, index)
        : text.startsWith('http', index)
          ? bareAddressTokenAt(text, index, reading.marks)
          : null
    if (link) {
      index += add(link, link.source.length)
      continue
    }
    plain += text[index]
    index += 1
  }
  if (plain !== '') found.push({ kind: 'text', text: plain })
  return found
}
