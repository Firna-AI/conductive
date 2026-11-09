import { useCallback, useLayoutEffect, useState } from 'react'
import type { WorkspaceTab } from '../../shared/workspace-view'
import type { TabPlace } from '../state/tab-order'
import type { TabNodes } from './tab-nodes'
import { rowKey, titleOf, viewTabOf, type RowTab } from './tab-row'

/** The last move of a tab of the row. */
export interface TabMove {
  /** The key of the moved tab. */
  key: string
  /** The index of the tab after the move, when the menu moved it. */
  to: number | null
  /** What the status of the row tells a screen reader about the move. */
  said: string
}

/**
 * The moves of the tabs of the row: the drop of a drag, and the step of one
 * place of the tab menu. Each move saves through `onMove`. After a step, the
 * focus goes back to the link of the tab, and the status of the row tells a
 * screen reader the new place, such as "app.ts moves to place 2 of 3". The
 * status says it only while the tab stays at that place, so a move that did
 * not save says nothing. `forget` drops the words, such as when a drag takes
 * over the status.
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
    setLast({ key: rowKey(tab), to: null, said: '' })
  }
  const step = (tab: RowTab, by: -1 | 1) => {
    const key = rowKey(tab)
    const index = tabs.findIndex((item) => rowKey(item) === key)
    const neighbour = tabs[index + by]
    if (index < 0 || !neighbour) return
    const next = viewTabOf(neighbour)
    onMove(viewTabOf(tab), by < 0 ? { before: next } : { after: next })
    const to = index + by
    const said = `${titleOf(tab)} moves to place ${to + 1} of ${tabs.length}`
    setLast({ key, to, said })
  }
  const at = last ? tabs.findIndex((tab) => rowKey(tab) === last.key) : -1
  const status = last !== null && at === last.to ? last.said : ''
  return { last, status, drop, step, forget }
}
