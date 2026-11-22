import {
  lineTargets,
  type TargetReader,
} from '../../markdown/markdown-destination'
import {
  lineLabelEnds,
  type LabelEndReader,
} from '../../markdown/markdown-labels'
import { bareAddressAt, webAddressStartAt } from '../../markdown/web-links'
import { mentionAt, type Mention } from '../../shared/mention-text'
import type { AgentSkill } from '../../shared/generated/AgentSkill'
import { skillTextAt } from '../../shared/skill-text'

/** A Markdown link, with its label and address as typed. */
export interface MarkdownLink {
  /** The text between the brackets. */
  label: string
  /** The text before the address, such as `[docs](` or `[docs]( <`. */
  before: string
  /** The address as typed, with its backslash escapes. */
  address: string
  /** The text after the address, such as `)`, `>)`, or ` "Docs")`. */
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
  | LinkToken
  | { kind: 'mention'; mention: Mention }
  | { kind: 'skill'; source: string; skill: AgentSkill }

/** Finds the skill of either agent that the name of a skill text names. */
export type SkillLookup = (name: string) => AgentSkill | undefined

/** What a reading of chat text looks for, besides code. */
interface Reading {
  /** Links count. A text that shows as typed reads again without them. */
  links: boolean
  /**
   * Whether a mention counts, as in a message of a member. The `@` of each
   * other mention reads as plain text.
   */
  mentions: (mention: Mention) => boolean
  /** Finds the skill of a skill text, as in a message of a member. */
  skills?: SkillLookup
}

/**
 * The Markdown link whose `[` stands at `at`, or null. Its label ends at the
 * first `]` outside code, and its target follows at once, with an optional
 * link title, as the file preview reads it. So a label can hold code. The
 * whole link stands on one line, as in the message field, so no chip takes
 * in a line break.
 */
function markdownLinkAt(
  text: string,
  at: number,
  targetAt: TargetReader,
  labelEndAt: LabelEndReader,
): LinkToken | null {
  const end = labelEndAt(at)
  if (end < 0 || text[end + 1] !== '(') return null
  const target = targetAt(end + 2)
  if (!target) return null
  return {
    kind: 'link',
    href: target.destination,
    source: text.slice(at, target.next),
    markdown: {
      label: text.slice(at + 1, end),
      before: text.slice(at, target.start),
      address: text.slice(target.start, target.end),
      after: text.slice(target.end, target.next),
      image: text[at - 1] === '!',
    },
  }
}

/** The bare web address at `at`, or null. */
function bareAddressTokenAt(text: string, at: number): LinkToken | null {
  const href = bareAddressAt(text, at)
  return href ? { kind: 'link', href, source: href, markdown: null } : null
}

/**
 * The tokens of the text of a sent message, from left to right. A backtick
 * starts code, which runs to the next backtick, or to the end of the text.
 * Outside code, a Markdown link and a bare web address each start where
 * they stand, so code in a link label stays in the link. A mention starts
 * at the start of the text, or after a space or a line break.
 */
export function tokens(text: string, reading: Reading): Token[] {
  const found: Token[] = []
  const targetAt = lineTargets(text)
  const labelEndAt = reading.links ? lineLabelEnds(text, 'code') : () => -1
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
    const mention = mentionAt(text, index)
    if (mention && reading.mentions(mention)) {
      index += add({ kind: 'mention', mention }, mention.source.length)
      continue
    }
    const skillText = reading.skills ? skillTextAt(text, index) : null
    const skill = skillText ? reading.skills?.(skillText.name) : undefined
    if (skillText && skill) {
      const { source } = skillText
      index += add({ kind: 'skill', source, skill }, source.length)
      continue
    }
    const link = !reading.links
      ? null
      : text[index] === '['
        ? markdownLinkAt(text, index, targetAt, labelEndAt)
        : webAddressStartAt(text, index) !== null
          ? bareAddressTokenAt(text, index)
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
