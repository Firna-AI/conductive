import type {
  PaneSide,
  TabMove,
} from '../../../docs/mockups/src/components/workspace/paneCopy'
import type { TabTarget } from '../state/tab-order'
import { paneMoveOf } from './pane-moves'
import { rowKey, viewTabOf, type RowTab } from './tab-row'

// The drop places of a drag of a tab in the column, and the move, the drop
// line, and the words of each place.

/**
 * A row of the column, as the drag of a tab sees it: its tabs in order,
 * and the pane whose content goes with it. On desktop, the content of a
 * pane takes drops that open or fill a pane. The one row of a phone holds
 * the tabs of both panes and has `pane` null: a drop on its chat moves
 * nothing.
 */
export interface DropRow {
  tabs: readonly RowTab[]
  pane: 0 | 1 | null
}

/** Where a drop puts the dragged tab. */
export type DropPlace =
  /**
   * In the row at `row`: before the tab at `index` among its other tabs,
   * else after the last one, in the pane `pane`. In the one row of a phone,
   * the place at the line between the panes has a side of the line, so
   * `pane` says which.
   */
  | { kind: 'row'; row: number; index: number; pane: 0 | 1 }
  /** A new pane on a side of the one pane (split panes decision 1 C). */
  | { kind: 'half'; side: PaneSide }
  /** The end of the row of the other pane. */
  | { kind: 'pane'; pane: 0 | 1 }
  /** A place where a drop changes nothing, such as the tab's own pane. */
  | { kind: 'stay' }

/** A drop place in a row. */
export type RowPlace = Extract<DropPlace, { kind: 'row' }>

/** Whether two places are the same, so a drag keeps the place it has. */
export function samePlace(a: DropPlace, b: DropPlace): boolean {
  switch (a.kind) {
    case 'row':
      return (
        b.kind === 'row' &&
        a.row === b.row &&
        a.index === b.index &&
        a.pane === b.pane
      )
    case 'half':
      return b.kind === 'half' && a.side === b.side
    case 'pane':
      return b.kind === 'pane' && a.pane === b.pane
    case 'stay':
      return b.kind === 'stay'
  }
}

/** The index of the first tab of the right pane in a row with both, if any. */
export function borderOf(tabs: readonly RowTab[]): number | null {
  const at = tabs.findIndex((tab) => tab.pane !== tabs[0]?.pane)
  return at > 0 ? at : null
}

/**
 * The move of a drop at `place`, or null for a drop that changes nothing:
 * a drop at the tab's own place, and a drop on the content of its own pane
 * or on a half of the only tab of the only pane.
 */
export function targetOf(
  place: DropPlace,
  rows: readonly DropRow[],
  key: string,
): TabTarget | null {
  switch (place.kind) {
    case 'stay':
      return null
    case 'half':
      return { newPane: place.side }
    case 'pane':
      return { pane: place.pane, place: 'end' }
    case 'row': {
      const tabs = rows[place.row]?.tabs ?? []
      const own = tabs.findIndex((tab) => rowKey(tab) === key)
      if (own === place.index && tabs[own].pane === place.pane) return null
      const others = tabs.filter((tab) => rowKey(tab) !== key)
      const { index, pane } = place
      const next = others[index]
      if (next?.pane === pane) {
        return { pane, place: { before: viewTabOf(next) } }
      }
      const last = others[index - 1]
      if (last?.pane === pane) {
        return { pane, place: { after: viewTabOf(last) } }
      }
      return null
    }
  }
}

/**
 * Where the drop line shows in a row: before a tab, before the line between
 * the two parts of the one row of a phone, or after the last tab.
 */
export type DropLineAt = { before: string } | 'border' | 'end'

/**
 * The drop line of a place in the row of `tabs`. At the tab's own place,
 * the line shows before the tab. A place at the end of the left part of a
 * phone row shows before the line between the parts.
 */
export function lineOf(
  place: RowPlace,
  tabs: readonly RowTab[],
  key: string,
): DropLineAt {
  const own = tabs.findIndex((tab) => rowKey(tab) === key)
  if (own === place.index && tabs[own].pane === place.pane) {
    return { before: key }
  }
  const next = tabs.filter((tab) => rowKey(tab) !== key)[place.index]
  const left = tabs[0]?.pane
  const endsLeft = place.pane === left && next?.pane !== left
  if (borderOf(tabs) !== null && endsLeft) return 'border'
  return next ? { before: rowKey(next) } : 'end'
}

/**
 * Where a drop at `place` puts the tab, for the status of its row: a place
 * in its pane, a place in the other pane, or a new pane. A drop that
 * changes nothing names the tab's own place.
 */
export function dragMove(
  place: DropPlace,
  rows: readonly DropRow[],
  tab: RowTab,
): TabMove {
  const key = rowKey(tab)
  const target = targetOf(place, rows, key)
  const tabs = rows.flatMap((row) => row.tabs)
  const pane = target ? paneMoveOf(tab, target, tabs) : null
  if (pane) return pane.move
  const holder = rows.find((row) =>
    row.tabs.some((item) => rowKey(item) === key),
  )
  const count = holder?.tabs.length ?? 1
  if (target && place.kind === 'row') {
    return { kind: 'place', place: place.index + 1, count }
  }
  const own = holder?.tabs.findIndex((item) => rowKey(item) === key) ?? 0
  return { kind: 'place', place: own + 1, count }
}
