import { useCallback, useLayoutEffect, useState } from 'react'
import type { WorkspaceTab } from '../../shared/workspace-view'
import type { TabPlace } from '../state/tab-order'
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

/**
 * The moves of the tabs of the row: the drop of a drag, and the step of one
 * place of the tab menu. Each move saves through `onMove`. Keep open of the
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
  onMove: (tab: WorkspaceTab, place: TabPlace) => void
}) {
  const { tabs, nodes, onMove } = props
  const [last, setLast] = useState<TabMove | null>(null)
  const forget = useCallback(() => setLast(null), [])
  useLayoutEffect(() => {
    if (last && last.to !== null) nodes.focus(last.key)
  }, [last, nodes])

  const drop = (tab: RowTab, place: TabPlace) => {
    onMove(viewTabOf(tab), place)
    setLast({ key: rowKey(tab), to: null, said: '', kept: false })
  }
  const step = (tab: RowTab, by: -1 | 1) => {
    const key = rowKey(tab)
    const index = tabs.findIndex((item) => rowKey(item) === key)
    const neighbour = tabs[index + by]
    if (index < 0 || !neighbour) return
    const next = viewTabOf(neighbour)
    onMove(viewTabOf(tab), by < 0 ? { before: next } : { after: next })
    const to = index + by
    const said = `${tab.title} moves to place ${to + 1} of ${tabs.length}`
    setLast({ key, to, said, kept: false })
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
