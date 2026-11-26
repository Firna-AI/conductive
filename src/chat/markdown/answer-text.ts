import { bareAddressAt, webAddressStartAt } from '../../markdown/web-links'
import { mentionAt, type Mention } from '../../shared/mention-text'
import type { FilePart } from '../links/chat-parts'
import { mentionTarget } from '../links/file-targets'
import { linkTarget } from '../links/workspace-links'
import type { AnswerPart, AnswerReading } from './answer-parts'

/** Adds a part, as part of the text before it when both are text. */
export function addPart(parts: AnswerPart[], part: AnswerPart): void {
  const last = parts.at(-1)
  if (part.kind === 'text' && last?.kind === 'text') last.text += part.text
  else if (part.kind !== 'text' || part.text !== '') parts.push(part)
}

/**
 * Whether a mention can start at `at`: at the start of the text when
 * `start` says so, after a space, or right after a `*`, `_`, or `~~` that
 * the text keeps as typed, as "The text of a mention" of `file-mentions.md`
 * says.
 */
function mentionStarts(text: string, at: number, start: boolean): boolean {
  if (at === 0) return start
  const before = text[at - 1]
  if (/\s/u.test(before) || before === '*' || before === '_') return true
  return text.startsWith('~~', at - 2)
}

/**
 * The mention at `at`. A mention ends before the next `*` or `~~` of the
 * text, so marks that the agent writes around it stay out of it. A mention
 * in double quotes ends at its closing quote.
 */
function mentionFrom(text: string, at: number): Mention | null {
  if (text[at + 1] === '"') return mentionAt(text.slice(at), 0)
  const stars = text.indexOf('*', at)
  const tildes = text.indexOf('~~', at)
  const ends = [stars, tildes].filter((end) => end > at)
  return mentionAt(text.slice(at, Math.min(text.length, ...ends)), 0)
}

/** The file chip of a mention that names an entry of the tree, and its rest. */
function mentionParts(mention: Mention, reading: AnswerReading): AnswerPart[] {
  const found = reading.files && mentionTarget(mention, reading.files.find)
  if (!found) return [{ kind: 'text', text: mention.source }]
  const file: FilePart = { kind: 'file', source: found.source, ...found.target }
  return [file, { kind: 'text', text: found.rest }]
}

/** A bare web address of the text: a chip, a link, or text. */
function addressParts(href: string, reading: AnswerReading): AnswerPart {
  const target = linkTarget(href, reading.links)
  if (target) return { kind: 'chip', target }
  const link = reading.web(href)
  if (!link) return { kind: 'text', text: href }
  return { kind: 'link', link, words: [{ kind: 'text', text: href }] }
}

/** The index of the next mention or HTTP(S) prefix from `at`, or -1. */
function nextUnit(text: string, at: number, mentions: boolean): number {
  for (let index = at; index < text.length; index += 1) {
    if (
      (mentions && text[index] === '@') ||
      webAddressStartAt(text, index) !== null
    )
      return index
  }
  return -1
}

/**
 * The parts of one text node of an agent message: its mentions of entries
 * of the tree as file chips, and its bare web addresses as chips or links,
 * with the text around them. `start` says whether a mention can start at
 * the start of the text: at the start of the block, after a line break, or
 * right after a mark.
 */
export function textParts(
  text: string,
  reading: AnswerReading,
  start: boolean,
): AnswerPart[] {
  const parts: AnswerPart[] = []
  const mentions = reading.files !== undefined
  let done = 0
  let at = nextUnit(text, 0, mentions)
  while (at >= 0) {
    let unit: AnswerPart[] = []
    let length = 0
    const mention =
      text[at] === '@' && mentionStarts(text, at, start)
        ? mentionFrom(text, at)
        : null
    const href = text[at] === '@' ? null : bareAddressAt(text, at)
    if (mention) {
      unit = mentionParts(mention, reading)
      length = mention.source.length
    } else if (href) {
      unit = [addressParts(href, reading)]
      length = href.length
    }
    if (length === 0) {
      at = nextUnit(text, at + 1, mentions)
      continue
    }
    addPart(parts, { kind: 'text', text: text.slice(done, at) })
    for (const part of unit) addPart(parts, part)
    done = at + length
    at = nextUnit(text, done, mentions)
  }
  addPart(parts, { kind: 'text', text: text.slice(done) })
  return parts
}
