import type { PanelWidth } from '../ui/components/layout/ResizeHandle'

/**
 * A move of the edge of a panel: by some px, or some percent for the split
 * of the right column, or to one end of its range.
 */
export type PanelMove = { by: number } | { to: 'min' | 'max' }

/** One drag of the edge of a panel. `by` is the change of the size. */
export interface PanelDrag {
  move(by: number): void
  /** Ends the drag at its last move. A second call changes nothing. */
  end(): void
}

/**
 * The size in whole px after a move from `from`, the size that the panel
 * shows. The size stays in a range that holds `from`: the range of the
 * panel, widened to `from` when the layout shows the panel outside it. So a
 * shrink never grows the panel, and Home and End go to the ends of that
 * range. `top` stops a move under the top of the range, such as at the room
 * beside the mark of the Explain popover. The handles of the columns and of
 * the popover all use this one rule.
 */
export function moveInRange(
  range: PanelWidth,
  from: number,
  move: PanelMove,
  top = Infinity,
): number {
  const shown = Math.round(from)
  const low = Math.min(range.min, shown)
  const high = Math.max(Math.min(range.max, Math.floor(top)), shown)
  const target = 'by' in move ? shown + move.by : move.to === 'min' ? low : high
  return Math.min(high, Math.max(low, Math.round(target)))
}

/**
 * One drag from `start`, the size that the panel shows. Each move shows its
 * size at once with `put`, and the end stores the last one with `keep`. A
 * drag that ends where it started gets back `before`, the size that the
 * user chose before the drag, and stores nothing.
 */
export function panelDrag(drag: {
  start: number
  before: number | null
  next: (by: number) => number
  put: (size: number | null) => void
  keep: (size: number) => void
}): PanelDrag {
  let last: number | null = null
  let ended = false
  return {
    move: (by) => {
      if (ended) return
      const size = drag.next(by)
      last = size === drag.start ? null : size
      drag.put(last ?? drag.before)
    },
    end: () => {
      if (ended) return
      ended = true
      if (last === null) drag.put(drag.before)
      else drag.keep(last)
    },
  }
}
