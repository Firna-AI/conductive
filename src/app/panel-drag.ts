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
 * Where Home and End go when the panel shows outside the range of its
 * handle. Each caller of `moveInRange` gives one, because the panels need
 * different ends:
 *
 * - `shown`: the range widens to hold the size that shows, and Home and End
 *   go to the ends of that wider range. So Home keeps a column that the
 *   layout shows narrower than its range. The columns take it.
 * - `range`: Home goes to the smallest size of the range, and End to the
 *   largest. `room` caps them and each grow, such as the room by the mark
 *   of the Explain popover. A grow from under the range goes at least to
 *   the smallest size, or to the room where the room is smaller. So Home
 *   gives a popover over a short answer the smallest size. The popover
 *   takes it.
 */
type RangePolicy =
  { readonly ends: 'shown' } | { readonly ends: 'range'; readonly room: number }

/**
 * The size in whole px after a move from `from`, the size that the panel
 * shows, with the ends that `policy` gives. The size stays in a range that
 * holds `from`, so a shrink never grows the panel and End never shrinks
 * it. The handles of the columns and of the popover all use this one rule.
 */
export function moveInRange(
  range: PanelWidth,
  from: number,
  move: PanelMove,
  policy: RangePolicy,
): number {
  const shown = Math.round(from)
  const room = policy.ends === 'range' ? Math.floor(policy.room) : Infinity
  const low = Math.min(range.min, shown)
  const high = Math.max(Math.min(range.max, room), shown)
  // The size of Home, and the least size of a grow.
  const least = policy.ends === 'range' ? Math.min(range.min, room) : low
  const target =
    'by' in move ? shown + move.by : move.to === 'min' ? least : high
  const size = Math.min(high, Math.max(low, Math.round(target)))
  return size > shown ? Math.max(size, least) : size
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
