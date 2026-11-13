/** The side of a pane of a split centre column (split panes decision 2 A). */
export type PaneSide = 'left' | 'right'

/**
 * Where a drop puts a dragged tab: a place in its own row, a place in the
 * row of the other pane, or a new pane on one side of the column. A place
 * counts from 1, of `count` tabs in that row after the drop.
 */
export type TabMove =
  | { kind: 'place'; place: number; count: number }
  | { kind: 'pane'; pane: PaneSide; place: number; count: number }
  | { kind: 'new-pane'; pane: PaneSide }

/**
 * What the status of a row tells a screen reader while a tab hovers over a
 * drop place, such as "Moving app.ts to the right pane, place 2 of 3".
 */
export function moveStatus(title: string, move: TabMove): string {
  switch (move.kind) {
    case 'place':
      return `Moving ${title} to place ${move.place} of ${move.count}`
    case 'pane':
      return `Moving ${title} to the ${move.pane} pane, place ${move.place} of ${move.count}`
    case 'new-pane':
      return `Moving ${title} to a new ${move.pane} pane`
  }
}
