/**
 * The marks of the attached files in the text of a draft. A mark is the
 * draft ID of a file between the private-use characters U+E000 and U+E001,
 * at the place of its chip. Typing and a plain paste cannot make a mark.
 * Send writes `@` and the copy path of the file in place of each mark.
 * Literal text escapes U+E000, U+E001, and U+E002 as U+E002 and a digit.
 */

const markStart = '\uE000'
const markEnd = '\uE001'
const literalEscape = '\uE002'
const literalCharacters = [markStart, markEnd, literalEscape]

/** The mark of the file with a draft ID. */
export function fileMark(id: string): string {
  return `${markStart}${id}${markEnd}`
}

/** Encodes literal draft text with U+E002 followed by 0, 1, or 2. */
export function literalText(text: string): string {
  return text.replace(
    /[\uE000\uE001\uE002]/g,
    (character) => `${literalEscape}${literalCharacters.indexOf(character)}`,
  )
}

/** A part of a draft: decoded literal text, or an attached-file mark. */
export type DraftPart =
  { kind: 'text'; text: string } | { kind: 'file'; id: string }

/** Rebuilds an internal draft without turning literal text into marks. */
export function draftText(parts: readonly DraftPart[]): string {
  return parts
    .map((part) =>
      part.kind === 'text' ? literalText(part.text) : fileMark(part.id),
    )
    .join('')
}

/** Splits an encoded draft into decoded literal text and attached-file marks. */
export function draftParts(text: string): DraftPart[] {
  const parts: DraftPart[] = []
  let plain = ''
  let index = 0
  while (index < text.length) {
    const character = text[index]
    const code = text[index + 1]
    if (
      character === literalEscape &&
      (code === '0' || code === '1' || code === '2')
    ) {
      plain += literalCharacters[Number(code)]
      index += 2
      continue
    }
    if (character === markStart) {
      let end = index + 1
      // IDs can contain escape characters. Only mark delimiters stop this scan.
      while (
        end < text.length &&
        text[end] !== markStart &&
        text[end] !== markEnd
      ) {
        end += 1
      }
      if (end > index + 1 && text[end] === markEnd) {
        if (plain !== '') parts.push({ kind: 'text', text: plain })
        plain = ''
        parts.push({ kind: 'file', id: text.slice(index + 1, end) })
        index = end + 1
        continue
      }
    }
    plain += character
    index += 1
  }
  if (plain !== '') parts.push({ kind: 'text', text: plain })
  return parts
}

/** The decoded literal text of a draft without its attached-file marks. */
export function withoutMarks(text: string): string {
  return draftParts(text)
    .map((part) => (part.kind === 'text' ? part.text : ''))
    .join('')
}
