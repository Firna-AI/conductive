import { mentionAt, type Mention } from '../../shared/mention-text'
import { bareLinkAt, markdownTargetAt } from './workspace-links'

/** A token of chat text, before the list of the org names its links. */
export type Token =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'mark' }
  | {
      kind: 'link'
      href: string
      source: string
      markdown: boolean
      /** The label of a Markdown link, between its brackets. */
      label?: string
      /** The link is a Markdown image, which starts with `!`. */
      image?: boolean
    }
  | { kind: 'mention'; mention: Mention }

/** What a reading of chat text looks for, besides code. */
export interface Reading {
  /** `**` marks bold, as in an answer. */
  marks: boolean
  /** Links count. A Markdown link of no workspace reads again without them. */
  links: boolean
  /**
   * Whether a mention counts, as in a message of a member. The `@` of each
   * other mention reads as plain text.
   */
  mentions: (mention: Mention) => boolean
  /**
   * A Markdown link or image whose target is not a web address counts, as
   * in an answer, where the target can be a path of the file tree.
   */
  paths?: boolean
}

/** The target of a Markdown link that is not a web address, such as a path. */
const pathTarget = /\(<([^<>\n]+)>\)|\(([^\s()<>]+)\)/y

/** The target of a Markdown link at `at`, as a web address or as a path. */
function targetAt(
  text: string,
  at: number,
  paths: boolean,
): { href: string; length: number } | null {
  const web = markdownTargetAt(text, at)
  if (web || !paths) return web
  pathTarget.lastIndex = at
  const match = pathTarget.exec(text)
  return match
    ? { href: match[1] ?? match[2] ?? '', length: match[0].length }
    : null
}

/**
 * The Markdown link whose `[` stands at `at`, or null. Its label ends at the
 * first `]` outside code, on the same line, and its target follows at once.
 * So a label can hold code or bold.
 */
function markdownLinkAt(
  text: string,
  at: number,
  paths: boolean,
): Token | null {
  let code = false
  for (let index = at + 1; index < text.length; index += 1) {
    const char = text[index]
    if (char === '\n') return null
    if (char === '`') code = !code
    else if (char === ']' && !code) {
      const target = targetAt(text, index + 1, paths)
      if (!target) return null
      const source = text.slice(at, index + 1 + target.length)
      const label = text.slice(at + 1, index)
      return { kind: 'link', href: target.href, source, markdown: true, label }
    }
  }
  return null
}

/**
 * The Markdown image whose `!` stands at `at`, with a target that is not a
 * web address, or null. Such an image counts only where paths count.
 */
function imageLinkAt(text: string, at: number): Token | null {
  if (text[at + 1] !== '[') return null
  const link = markdownLinkAt(text, at + 1, true)
  if (link?.kind !== 'link' || /^https?:/u.test(link.href)) return null
  return { ...link, source: `!${link.source}`, image: true }
}

/**
 * The bare web address at `at`, or null. Where `**` marks bold, the address
 * ends before the next mark, so bold around the address stays bold.
 */
function bareLinkTokenAt(
  text: string,
  at: number,
  marks: boolean,
): Token | null {
  const mark = marks ? text.indexOf('**', at) : -1
  const href = bareLinkAt(mark === -1 ? text : text.slice(0, mark), at)
  return href ? { kind: 'link', href, source: href, markdown: false } : null
}

/**
 * The mention at `at`, or null. Where `**` marks bold, the mention ends
 * before the next mark, so bold around a mention stays bold.
 */
function mentionTokenAt(
  text: string,
  at: number,
  marks: boolean,
): Mention | null {
  const mark = marks ? text.indexOf('**', at) : -1
  return mentionAt(mark === -1 ? text : text.slice(0, mark), at)
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
    const mention = mentionTokenAt(text, index, reading.marks)
    if (mention && reading.mentions(mention)) {
      index += add({ kind: 'mention', mention }, mention.source.length)
      continue
    }
    const paths = reading.paths === true
    const link = !reading.links
      ? null
      : text[index] === '['
        ? markdownLinkAt(text, index, paths)
        : paths && text[index] === '!'
          ? imageLinkAt(text, index)
          : text.startsWith('http', index)
            ? bareLinkTokenAt(text, index, reading.marks)
            : null
    if (link?.kind === 'link') {
      index += add(link, link.source.length)
      continue
    }
    plain += text[index]
    index += 1
  }
  if (plain !== '') found.push({ kind: 'text', text: plain })
  return found
}
