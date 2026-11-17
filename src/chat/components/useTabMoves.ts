import { useCallback, useLayoutEffect, useState } from 'react'
import type { WorkspaceTab } from '../../shared/workspace-view'
import type { TabPlace, TabTarget } from '../state/tab-order'
import type { TabNodes } from './tab-nodes'
import { rowKey, viewTabOf, type RowTab } from './tab-row'

/** The last move of a tab of the row, or the last keep of the temporary tab. */
export interface TabMove {
  /** The key of the tab that moved, or that Keep open kept. */
  key: string
  /**
   * The index of the tab after an item of the tab menu: its new place after
   * a move, or its own place after Keep open. Null after a drop.
   */
  to: number | null
  /** What the status of the row tells a screen reader about the change. */
  said: string
  /** Keep open kept the tab, which moved nowhere. */
  kept: boolean
}

/** The name of a pane for a screen reader. */
const paneNames = { 0: 'left', 1: 'right' } as const

/**
 * The moves of the tabs of the row: the drop of a drag, and the step of one
 * place of the tab menu. Each move saves through `onMove`, in the pane of
 * the tab next to its new place. In the one row of a phone, a step across
 * the line between the two panes moves the tab to the near end of the
 * other pane, and the status names that pane. Keep open of the
 * tab menu keeps the temporary tab in its place, through the `keep` of its
 * host. After a step or a keep, the focus goes back to the link of the tab,
 * and the status of the row tells a screen reader what changed, such as
 * "app.ts moves to place 2 of 3" or "README.md stays open". The status says
 * it only while the tab stays at that place, so a move that did not save
 * says nothing. `moved` is the last move, for the scroll of the row, and a
 * keep is none. `forget` drops the words, such as when a drag takes over
 * the status.
 */
export function useTabMoves(props: {
  tabs: readonly RowTab[]
  nodes: TabNodes
  onMove: (tab: WorkspaceTab, target: TabTarget) => void
}) {
  const { tabs, nodes, onMove } = props
  const [last, setLast] = useState<TabMove | null>(null)
  const forget = useCallback(() => setLast(null), [])
  useLayoutEffect(() => {
    if (last && last.to !== null) nodes.focus(last.key)
  }, [last, nodes])

  const drop = (tab: RowTab, target: TabTarget) => {
    onMove(viewTabOf(tab), target)
    setLast({ key: rowKey(tab), to: null, said: '', kept: false })
  }
  const step = (tab: RowTab, by: -1 | 1) => {
    const key = rowKey(tab)
    const index = tabs.findIndex((item) => rowKey(item) === key)
    const neighbour = tabs[index + by]
    if (index < 0 || !neighbour) return
    const next = viewTabOf(neighbour)
    const { pane } = neighbour
    const across = pane !== tab.pane
    // A step in a pane goes past its neighbour. A step across the line stops
    // at the near end of the other pane, so it lands on this side of it.
    const before = across ? by > 0 : by < 0
    const place: TabPlace = before ? { before: next } : { after: next }
    onMove(viewTabOf(tab), { pane, place })
    if (!across) {
      const to = index + by
      const said = `${tab.title} moves to place ${to + 1} of ${tabs.length}`
      setLast({ key, to, said, kept: false })
      return
    }
    // The tab keeps its place in the row, and the line moves past it.
    const count = tabs.filter((item) => item.pane === pane).length + 1
    const at = by > 0 ? 1 : count
    const said = `${tab.title} moves to the ${paneNames[pane]} pane, place ${at} of ${count}`
    setLast({ key, to: index, said, kept: false })
  }
  const keep = (tab: RowTab) => {
    const key = rowKey(tab)
    const to = tabs.findIndex((item) => rowKey(item) === key)
    if (to < 0 || tab.kind !== 'host' || tab.keep === null) return
    tab.keep()
    setLast({ key, to, said: `${tab.title} stays open`, kept: true })
  }
  const at = last ? tabs.findIndex((tab) => rowKey(tab) === last.key) : -1
  const status = last !== null && at === last.to ? last.said : ''
  const moved = last !== null && !last.kept ? last : null
  return { moved, status, drop, step, keep, forget }
}
