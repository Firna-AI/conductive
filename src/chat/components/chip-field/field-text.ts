import { textParts } from '../../links/workspace-links'

/** A part of the plain text of the field: text, or the exact link of a chip. */
export type FieldPart =
  { kind: 'text'; text: string } | { kind: 'chip'; source: string }

/** The text from `at` to the end of its line. */
function lineFrom(text: string, at: number): string {
  const end = text.indexOf('\n', at)
  return end === -1 ? text.slice(at) : text.slice(at, end)
}

/**
 * Whether the link `source` stays one link, as written, between `before`
 * and `after`. Only the line of the link counts, because no link holds a
 * line break.
 */
function staysLink(before: string, source: string, after: string): boolean {
  const line = before.slice(before.lastIndexOf('\n') + 1)
  let at = 0
  for (const part of textParts(line + source + lineFrom(after, 0))) {
    if (at === line.length) {
      return part.kind === 'link' && part.source === source
    }
    if (at > line.length) return false
    at += part.kind === 'link' ? part.source.length : part.text.length
  }
  return false
}

/** The text after the part at `index`, up to the next chip. */
function textAfter(parts: readonly FieldPart[], index: number): string {
  let text = ''
  for (const part of parts.slice(index + 1)) {
    if (part.kind === 'chip') return text + part.source
    text += part.text
  }
  return text
}

/** The spaces around a chip: none, after, before, or both, in that order. */
const spacings = [
  ['', ''],
  ['', ' '],
  [' ', ''],
  [' ', ' '],
] as const

/**
 * The plain text of the parts, with the exact link of each chip. A space
 * goes beside a chip only where the text next to it would join its link,
 * such as a word typed right after the chip. So the sent message, a copy,
 * and a draft that comes back each keep the link of every chip.
 */
export function joinFieldParts(parts: readonly FieldPart[]): string {
  let text = ''
  let pending = ''
  parts.forEach((part, index) => {
    if (part.kind === 'text') {
      text += pending + part.text
      pending = ''
      return
    }
    const after = textAfter(parts, index)
    const [before, behind] =
      spacings.find(([lead, trail]) =>
        staysLink(text + pending + lead, part.source, trail + after),
      ) ?? spacings[0]
    text += pending + before + part.source
    pending = after === '' ? '' : behind
  })
  return text
}
