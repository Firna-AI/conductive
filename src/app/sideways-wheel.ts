import { useEffect, type RefObject } from 'react'

/** The CSS px of one line of a wheel that turns by lines, as Firefox can. */
const lineHeight = 40

/** The turn of a wheel event along its vertical axis, in CSS px. */
function verticalTurn(event: WheelEvent, row: HTMLElement): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * lineHeight
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * row.clientWidth
  }
  return event.deltaY
}

/**
 * Makes a vertical turn of the mouse wheel over a row that scrolls sideways
 * scroll the row sideways, by the same distance. A sideways swipe, such as
 * on a trackpad, scrolls the row as before, and so does a turn with Ctrl,
 * which zooms. A row that does not overflow, or that is at the end that the
 * turn goes to, leaves the turn to the page. It returns the cleanup.
 */
function sidewaysWheel(row: HTMLElement): () => void {
  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    const end = row.scrollWidth - row.clientWidth
    if (end <= 0) return
    const left = Math.min(
      end,
      Math.max(0, row.scrollLeft + verticalTurn(event, row)),
    )
    // A zoomed page can keep the end a fraction of a pixel away.
    if (Math.abs(left - row.scrollLeft) < 1) return
    event.preventDefault()
    row.scrollLeft = left
  }
  // The listener cancels the turn, so it cannot be passive.
  row.addEventListener('wheel', onWheel, { passive: false })
  return () => row.removeEventListener('wheel', onWheel)
}

/** `sidewaysWheel` on the element of `row` while it is mounted. */
export function useSidewaysWheel(row: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const node = row.current
    return node ? sidewaysWheel(node) : undefined
  }, [row])
}
