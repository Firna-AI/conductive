/**
 * The marks of the attached files in the text of a draft. A mark is the
 * draft ID of a file between the private-use characters U+E000 and U+E001,
 * at the place of its chip. Typing and a plain paste cannot make a mark.
 * Send writes `@` and the copy path of the file in place of each mark.
 */

const markStart = '\uE000'
const markEnd = '\uE001'

/** The marks of a text, each with the draft ID of its file. */
const markPattern = /\uE000([^\uE000\uE001]+)\uE001/g

/** The mark of the file with a draft ID. */
export function fileMark(id: string): string {
  return `${markStart}${id}${markEnd}`
}

/** A part of a draft: plain text, or the mark of an attached file. */
export type DraftPart =
  { kind: 'text'; text: string } | { kind: 'file'; id: string }

/** Splits the text of a draft into plain text and the marks of its files. */
export function draftParts(text: string): DraftPart[] {
  const parts: DraftPart[] = []
  let end = 0
  for (const match of text.matchAll(markPattern)) {
    if (match.index > end) {
      parts.push({ kind: 'text', text: text.slice(end, match.index) })
    }
    parts.push({ kind: 'file', id: match[1] })
    end = match.index + match[0].length
  }
  if (end < text.length) parts.push({ kind: 'text', text: text.slice(end) })
  return parts
}

/** The text of a draft without the marks of its files. */
export function withoutMarks(text: string): string {
  return text.replace(markPattern, '')
}
