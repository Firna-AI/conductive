import { useCallback, useLayoutEffect, useState } from 'react'
import type { WorkspaceTab } from '../../shared/workspace-view'
import type { TabTarget } from '../state/tab-order'
import { movedStatus, paneMoveOf } from './pane-moves'
import type { TabNodes } from './tab-nodes'
import { rowKey, viewTabOf, type RowTab } from './tab-row'

/** The last move of a tab to another pane, which the status says. */
interface PaneMove {
  key: string
  said: string
  /** The keys of the row of the tab after the move, as the move gives them. */
  row: readonly string[]
  /** The move came from the tab menu, so the focus goes to the tab. */
  focus: boolean
}

/** Whether two lists hold the same keys in the same order. */
function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index])
}

/**
 * The moves of tabs to another pane on desktop: by a drop in the other row
 * or on the content of a pane, and by the pane item of the tab menu. Each
 * move saves through `onMove`, which shows the tab in its new pane and
 * makes that pane the focused pane. The status of the column tells a screen
 * reader the new pane and place, such as "app.ts moves to the right pane,
 * place 2 of 3". The status belongs
 * to the column, because the move can open the row of the tab or close the
 * row that it left, and a status that a new row brings may not be heard. It
 * says the move only while the row of the tab holds the tabs of the move,
 * so a move that did not save says nothing. After a move from the tab menu,
 * the focus goes to the link of the tab in its new row. `forget` drops the
 * words, such as when a drag starts.
 */
export function usePaneMoves(props: {
  rows: readonly (readonly RowTab[])[]
  nodes: TabNodes
  onMove: (tab: WorkspaceTab, target: TabTarget) => void
}) {
  const { rows, nodes, onMove } = props
  const [last, setLast] = useState<PaneMove | null>(null)
  const forget = useCallback(() => setLast(null), [])
  useLayoutEffect(() => {
    if (last?.focus) nodes.focus(last.key)
  }, [last, nodes])

  const move = (tab: RowTab, target: TabTarget, focus: boolean) => {
    const moved = paneMoveOf(tab, target, rows.flat())
    onMove(viewTabOf(tab), target)
    if (!moved) return
    const said = movedStatus(tab.title, moved.move)
    setLast({ key: rowKey(tab), said, row: moved.keys, focus })
  }
  const holder = last
    ? rows.find((row) => row.some((tab) => rowKey(tab) === last.key))
    : undefined
  const keys = holder?.map(rowKey) ?? []
  const status = last && sameKeys(keys, last.row) ? last.said : ''
  return { status, move, forget }
}
