import type { KeyboardEvent } from 'react'
import { splitLines } from '../model/file-text'

/** One line of a code box, as a copy gives it: its text and its line end. */
export interface CopyLine {
  text: string
  ending: string
}

/** The attribute of a row that names the index of its `CopyLine`. */
const copyLineAttribute = 'data-copy-line'

/** The attribute of the cell that holds the text of a row. */
const copyTextAttribute = 'data-copy-text'

/**
 * The copy lines of a text, with the rows of `splitLines`. Each line ends
 * in a line feed, except a last line that the text does not end.
 */
export function copyLines(text: string): CopyLine[] {
  const lines = splitLines(text)
  const ended = /(\r\n|\n|\r)$/.test(text)
  return lines.map((line, index) => ({
    text: line,
    ending: index < lines.length - 1 || ended ? '\n' : '',
  }))
}

/** Cmd+A on a Mac, or Ctrl+A, with no other modifier key. */
export function isSelectAll(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'a'
  )
}

/** Selects the whole content of `box`, in place of the whole page. */
export function selectAllIn(box: Element): void {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(box)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * The column of a boundary point in the text cell of a row: 0 before the
 * cell, such as in the line number, and the length after it.
 */
function column(cell: Element, node: Node, offset: number, length: number) {
  const probe = document.createRange()
  probe.selectNodeContents(cell)
  const place = probe.comparePoint(node, offset)
  if (place !== 0) return place < 0 ? 0 : length
  probe.setEnd(node, offset)
  return Math.min(probe.toString().length, length)
}

/** Whether the boundary point comes after the whole of `row`. */
function isAfter(row: Element, node: Node, offset: number): boolean {
  const probe = document.createRange()
  probe.selectNodeContents(row)
  return probe.comparePoint(node, offset) > 0
}

/**
 * The source text of the part of each row that `range` selects. A row that
 * the range passes gives its line end too. So an empty line stays in the
 * copy, and select all gives the exact text.
 */
export function copiedText(
  range: Range,
  box: Element,
  lines: readonly CopyLine[],
): string {
  let text = ''
  for (const row of box.querySelectorAll(`[${copyLineAttribute}]`)) {
    if (!range.intersectsNode(row)) continue
    const line = lines[Number(row.getAttribute(copyLineAttribute))]
    const cell = row.querySelector(`[${copyTextAttribute}]`)
    if (!line || !cell) continue
    const { length } = line.text
    const start = column(cell, range.startContainer, range.startOffset, length)
    const end = column(cell, range.endContainer, range.endOffset, length)
    text += line.text.slice(start, end)
    if (isAfter(row, range.endContainer, range.endOffset)) text += line.ending
  }
  return text
}
