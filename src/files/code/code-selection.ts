import type { KeyboardEvent } from 'react'
import { splitLines } from '../model/file-text'

/**
 * The text that a copy from a code view takes its parts from: the lines of
 * the view, each with a line feed, except a last line that the text does
 * not end. `starts` holds the offset in `text` of the first character of
 * each line.
 */
export interface CopySource {
  lines: readonly string[]
  text: string
  starts: readonly number[]
}

/** A row of a code view, with the index of its line in `data-copy-line`. */
const rowSelector = '[data-copy-line]'

/** The cell that holds the text of a row. */
const cellSelector = '[data-copy-text]'

/** The copy source of a text, with the lines of `splitLines`. */
export function copySource(text: string): CopySource {
  const lines = splitLines(text)
  const ended = lines.length > 0 && /(\r\n|\n|\r)$/.test(text)
  const starts: number[] = []
  let start = 0
  for (const line of lines) {
    starts.push(start)
    start += line.length + 1
  }
  return { lines, text: lines.join('\n') + (ended ? '\n' : ''), starts }
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

/** The index of the line that `row` shows. */
function lineIndex(row: Element): number {
  return Number(row.getAttribute('data-copy-line'))
}

/** The offset in the source text of the start of a line. */
function lineStart(index: number, source: CopySource): number {
  return source.starts[index] ?? source.text.length
}

/**
 * The offset in the source text of a boundary point in `box`. A point in a
 * row maps through the text cell of that row. A point between rows, such
 * as the start or the end of the whole box after select all, maps to the
 * start of the next row, or to the end of the text. Only the row of the
 * point is read, so the cost does not grow with the length of the file.
 */
function sourceOffset(
  box: Element,
  node: Node,
  offset: number,
  source: CopySource,
): number {
  const element = node instanceof Element ? node : node.parentElement
  const row = element?.closest(rowSelector)
  if (row && box.contains(row)) {
    const index = lineIndex(row)
    const cell = row.querySelector(cellSelector)
    const length = source.lines[index]?.length ?? 0
    const start = lineStart(index, source)
    return start + (cell ? column(cell, node, offset, length) : 0)
  }
  const next = node.childNodes[offset]
  if (!(next instanceof Element)) return source.text.length
  const nextRow = next.matches(rowSelector)
    ? next
    : next.querySelector(rowSelector)
  return nextRow ? lineStart(lineIndex(nextRow), source) : source.text.length
}

/**
 * The source text of each range of `selection`, in order. A browser can
 * split one drag into several ranges, such as Firefox at each line number.
 * A caret gives nothing. Null means that a range reaches out of `box`, so
 * the copy is not the box's own.
 */
export function copiedText(
  selection: Selection,
  box: Element,
  source: CopySource,
): string | null {
  let text = ''
  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index)
    if (range.collapsed) continue
    if (!box.contains(range.commonAncestorContainer)) return null
    const { startContainer, startOffset, endContainer, endOffset } = range
    const start = sourceOffset(box, startContainer, startOffset, source)
    const end = sourceOffset(box, endContainer, endOffset, source)
    text += source.text.slice(start, end)
  }
  return text
}
