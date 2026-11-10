import type { TabNodes } from './tab-nodes'

// Where the tabs of a row that scrolls sideways are, and the scroll that
// brings them into view.

/** The left side of what the row holds, in CSS px of the window. */
function originOf(row: HTMLElement): number {
  return row.getBoundingClientRect().left + row.clientLeft - row.scrollLeft
}

/**
 * Scrolls the row as little as it can, so that the tabs show whole, clear
 * of the scroll padding of the row: the first tab first, then each next tab
 * as far as it still shows with the ones before it. A first tab wider than
 * the row shows its start.
 */
function reveal(row: HTMLElement, tabs: readonly HTMLElement[]): void {
  const style = getComputedStyle(row)
  const padStart = parseFloat(style.scrollPaddingInlineStart) || 0
  const padEnd = parseFloat(style.scrollPaddingInlineEnd) || 0
  const max = Math.max(0, row.scrollWidth - row.clientWidth)
  const clamp = (value: number) => Math.min(Math.max(value, 0), max)
  const origin = originOf(row)
  let low = 0
  let high = max
  for (const [index, tab] of tabs.entries()) {
    const box = tab.getBoundingClientRect()
    const start = box.left - origin
    const to = clamp(start - padStart)
    let from = clamp(start + box.width + padEnd - row.clientWidth)
    if (from > to) {
      if (index > 0) break
      from = to
    }
    if (Math.max(low, from) > Math.min(high, to)) break
    low = Math.max(low, from)
    high = Math.min(high, to)
  }
  const left = Math.min(Math.max(row.scrollLeft, low), high)
  if (Math.abs(left - row.scrollLeft) >= 1) row.scrollLeft = left
}

/** Scrolls the row so that the tabs of the keys show, as `reveal` says. */
export function revealKeys(
  row: HTMLElement,
  nodes: TabNodes,
  keys: readonly (string | null)[],
): void {
  const tabs = keys.flatMap((key) => {
    const item = key === null ? undefined : nodes.item(key)
    return item ? [item] : []
  })
  if (tabs.length > 0) reveal(row, tabs)
}

/** Where a tab is in what the row holds, in CSS px. A scroll keeps it. */
export interface Place {
  key: string
  start: number
  width: number
}

/** The place of the tab with this key, while it shows. */
export function placeOf(
  row: HTMLElement,
  nodes: TabNodes,
  key: string | null,
): Place | null {
  if (key === null) return null
  const item = nodes.item(key)
  if (!item) return null
  const box = item.getBoundingClientRect()
  return { key, start: box.left - originOf(row), width: box.width }
}

/** Whether a tab kept its size and its place, to less than a CSS px. */
export function samePlace(last: Place | null, next: Place | null): boolean {
  if (last === null || next === null) return last === next
  return (
    last.key === next.key &&
    Math.abs(last.start - next.start) < 1 &&
    Math.abs(last.width - next.width) < 1
  )
}
