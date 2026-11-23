import type { KeyboardEvent } from 'react'

/** Cmd+A on a Mac, or Ctrl+A, with no other modifier key. */
function isSelectAll(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'a'
  )
}

/**
 * The key handler of a focusable code box. Select all selects the text of
 * the box only. Without it, the browser selects the whole page, with the
 * tabs and the lists. The line numbers do not go into a copy, because they
 * cannot be selected.
 */
export function selectAllInBox(event: KeyboardEvent<HTMLElement>): void {
  if (!isSelectAll(event)) return
  const selection = window.getSelection()
  if (!selection) return
  event.preventDefault()
  const range = document.createRange()
  range.selectNodeContents(event.currentTarget)
  selection.removeAllRanges()
  selection.addRange(range)
}
