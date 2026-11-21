/**
 * The line breaks of Markdown text: each line-break tag of the text, and
 * the rules of the breaks that a block draws (design calls 2 and 3 of the
 * Markdown plan).
 */

import type { MarkItem } from './markdownMarks'

/** `<br>`, `<br/>`, and `<br />`, in any letter case. */
const breakTag = /<br\s*\/?>/i

/** Text with each line-break tag as a line break. Other tags stay text. */
export function breakItems<Unit>(text: string): MarkItem<Unit>[] {
  return text
    .split(breakTag)
    .flatMap((piece, index): MarkItem<Unit>[] => [
      ...(index > 0 ? [{ kind: 'break' } as const] : []),
      ...(piece === '' ? [] : [{ kind: 'text', text: piece } as const]),
    ])
}

/** Whether an item shows anything: a unit, or text other than spaces. */
function shows<Unit>(item: MarkItem<Unit>): boolean {
  return (
    item.kind === 'unit' || (item.kind === 'text' && item.text.trim() !== '')
  )
}

/**
 * The items of a block with the line breaks that it draws. A break at the
 * start or at the end of the block draws nothing, so a block of only breaks
 * draws nothing. Two or more breaks in a row draw at most one empty line.
 */
export function keptBreaks<Unit>(
  items: readonly MarkItem<Unit>[],
): MarkItem<Unit>[] {
  const first = items.findIndex(shows)
  const last = items.findLastIndex(shows)
  if (first < 0) return []
  let row = 0
  return items.slice(first, last + 1).filter((item) => {
    if (item.kind === 'break') row += 1
    else if (shows(item)) row = 0
    return row <= 2
  })
}
