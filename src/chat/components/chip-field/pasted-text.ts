import type { DraftFile } from '../../../app/draft-files'
import { nameOf } from './attached-files'

/** A paste with at least this many characters becomes an attached file. */
export const PASTE_FILE_CHARACTERS = 2000

/** A paste with at least this many lines becomes an attached file. */
export const PASTE_FILE_LINES = 40

/** The name of the first pasted file of a draft, before its extension. */
const PASTE_STEM = 'Pasted text'

/** The media type of a pasted file. */
const PASTE_TYPE = 'text/plain'

/** The number of lines of a text, whatever line ends a system writes. */
function lineCount(text: string): number {
  return text.split(/\r\n?|\n/).length
}

/**
 * Whether a plain text paste is large enough to become an attached file in
 * place of text in the field.
 */
export function isLargePaste(text: string): boolean {
  return (
    text.length >= PASTE_FILE_CHARACTERS || lineCount(text) >= PASTE_FILE_LINES
  )
}

/**
 * The number of a pasted file name, such as 2 for "Pasted text 2.txt", or
 * null for another name. The first name, "Pasted text.txt", has number 1.
 */
function pasteNumber(name: string): number | null {
  const match = /^Pasted text(?: (\d+))?\.txt$/.exec(name)
  if (match === null) return null
  return match[1] === undefined ? 1 : Number(match[1])
}

/**
 * The name of the next pasted file of a draft: "Pasted text.txt" for the
 * first, then "Pasted text 2.txt" and on, after the highest number that the
 * draft holds. So the chips of two pastes in one draft show different names.
 */
export function pastedFileName(held: readonly DraftFile[]): string {
  const numbers = held.flatMap((item) => pasteNumber(nameOf(item)) ?? [])
  const next = numbers.length === 0 ? 1 : Math.max(...numbers) + 1
  return next === 1 ? `${PASTE_STEM}.txt` : `${PASTE_STEM} ${next}.txt`
}

/** The file of a large paste: its exact text, as plain text. */
export function pastedFile(text: string, held: readonly DraftFile[]): File {
  return new File([text], pastedFileName(held), { type: PASTE_TYPE })
}
