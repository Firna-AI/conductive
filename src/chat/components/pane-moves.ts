import type {
  PaneSide,
  TabMove,
} from '../../../docs/mockups/src/components/workspace/paneCopy'
import { tabKey } from '../../shared/workspace-panes'
import type { TabTarget } from '../state/tab-order'
import { rowKey, type RowTab } from './tab-row'

/** The side of a pane of the saved view: the first pane is the left pane. */
export function paneSide(pane: 0 | 1): PaneSide {
  return pane === 0 ? 'left' : 'right'
}

/**
 * The pane item of the tab menu (split panes decision 4 B). With two panes
 * in the saved view, it reads Move to the other pane, else Open in a new
 * pane. `move` moves the tab, or is null where the item is off, as on a
 * phone.
 */
export interface PaneItem {
  split: boolean
  move: ((tab: RowTab) => void) | null
}

/**
 * The move of the pane item: to the end of the row of the other pane, as a
 * drop on the content of that pane does, or with one pane to a new pane on
 * the right.
 */
export function otherPane(tab: RowTab, split: boolean): TabTarget {
  if (!split) return { newPane: 'right' }
  return { pane: tab.pane === 0 ? 1 : 0, place: 'end' }
}

/**
 * What the status tells a screen reader after a move: the tab, its new
 * pane, and its new place, such as "app.ts moves to the right pane, place
 * 2 of 3", as `moveStatus` of the mockups says it during the drag. A tab
 * that opens a new pane takes its only place, as in "app.ts moves to the
 * right pane, place 1 of 1".
 */
export function movedStatus(title: string, move: TabMove): string {
  switch (move.kind) {
    case 'place':
      return `${title} moves to place ${move.place} of ${move.count}`
    case 'pane':
      return `${title} moves to the ${move.pane} pane, place ${move.place} of ${move.count}`
    case 'new-pane':
      return `${title} moves to the ${move.pane} pane, place 1 of 1`
  }
}

/**
 * The move of a tab to another pane, from the tabs that the rows show:
 * the new pane, its place, and the keys of that pane's tabs after the move.
 * Null when the target keeps the tab in its pane, or names a tab that no
 * row shows.
 */
export function paneMoveOf(
  tab: RowTab,
  target: TabTarget,
  tabs: readonly RowTab[],
): { move: TabMove; keys: string[] } | null {
  const key = rowKey(tab)
  if ('newPane' in target) {
    return { move: { kind: 'new-pane', pane: target.newPane }, keys: [key] }
  }
  if (target.pane === tab.pane) return null
  const keys = tabs
    .filter((item) => item.pane === target.pane && rowKey(item) !== key)
    .map(rowKey)
  const { place } = target
  let at = keys.length
  if (place !== 'end') {
    const neighbour = keys.indexOf(
      tabKey('before' in place ? place.before : place.after),
    )
    if (neighbour < 0) return null
    at = 'after' in place ? neighbour + 1 : neighbour
  }
  const move: TabMove = {
    kind: 'pane',
    pane: paneSide(target.pane),
    place: at + 1,
    count: keys.length + 1,
  }
  return { move, keys: [...keys.slice(0, at), key, ...keys.slice(at)] }
}
