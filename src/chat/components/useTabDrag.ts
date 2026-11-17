import { useState, type RefCallback } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { moveStatus } from '../../../docs/mockups/src/components/workspace/paneCopy'
import tabDrag from '../../../docs/mockups/src/components/workspace/TabDrag.module.css'
import { usePointerDrag } from '../../app/pointer-drag'
import type { TabTarget } from '../state/tab-order'
import { movedStatus, paneMoveOf } from './pane-moves'
import type { PaneMark } from './TabDragParts'
import {
  dragMove,
  lineOf,
  samePlace,
  targetOf,
  type DropLineAt,
  type DropPlace,
  type DropRow,
} from './tab-drop'
import { locateDrop } from './tab-drop-locate'
import { ElementRefs, type TabNodes } from './tab-nodes'
import { rowKey, type RowTab, type TabItemProps } from './tab-row'
import local from './tabs.module.css'

/** What a row does with a drag of its tab that stays in the row. */
export interface RowDrops {
  /** A long press that ends with no move opens the tab menu at the press. */
  hold: (key: string, at: { x: number; y: number }) => void
  /**
   * A drop in the row of the tab. `after` gives the status of a drop across
   * the line between the two parts of a phone row, and the index of the
   * tab in the row after the move.
   */
  drop: (
    tab: RowTab,
    target: TabTarget,
    after: { to: number; said: string } | null,
  ) => void
}

/** What a row draws for the drag of its column. */
export interface TabRowDrag {
  /** The elements of the tabs of the column, which the row also scrolls. */
  nodes: TabNodes
  /** The props of the list item of the tab at `index` of the row. */
  item: (tab: RowTab, index: number, drops: RowDrops) => TabItemProps
  /** Where the drop line shows in the row, or null. */
  line: DropLineAt | null
  /** What the status of the row of the dragged tab tells a screen reader. */
  status: string
  /** The lifted tab, its centre, and its top, in the row of the tab. */
  lifted: { tab: RowTab; x: number; top: number } | null
  /**
   * The pointer while the drop place is in the row, and whether it moved
   * after the lift, for the scroll near the ends of the row.
   */
  edge: { x: number; moved: boolean } | null
  /** A drag runs in the column. */
  dragging: boolean
}

/** What a pressed tab carries: its key, and what its row does with a drop. */
interface DragItem {
  key: string
  drops: RowDrops
}

/** The lifted tab hangs below the row: its top is 70% down the tab. */
const hang = 0.7

/**
 * The drag of the tabs of a column, on the shared pointer drag: the one or
 * two rows of the panes on desktop, or the one row of a phone. A tab keeps
 * its place as a faint copy, a line that takes no space marks the drop
 * place in a row, and a lifted copy hangs below the row of the tab under the
 * pointer. Over the content of a pane, a mark shows where a drop moves the
 * tab, as `locateDrop` says: a half of the one pane opens a new pane, and
 * the other pane of a split takes the tab at the end of its row. A drop that
 * changes nothing shows no mark. A drop in the row of the tab goes to that
 * row, and a drop in another row or on a pane goes to `onPaneMove`. A long
 * press that ends with no move opens the tab menu. A read-only column binds
 * no drag, and neither does a tab that shows its rename field. Escape ends
 * a drag with no move.
 */
export function useTabDrag(props: {
  rows: readonly DropRow[]
  nodes: TabNodes
  /** The saved view holds two panes. */
  split: boolean
  enabled: boolean
  renaming: string | null
  onPaneMove: (tab: RowTab, target: TabTarget) => void
}) {
  const { rows, nodes } = props
  const [contents] = useState(() => new ElementRefs())
  const area = { rows, nodes, contents, split: props.split }
  const { drag, bind } = usePointerDrag<DragItem, DropPlace>({
    locate: ({ key }, x, y, last) => {
      const place = locateDrop(area, key, x, y)
      return samePlace(place, last) ? last : place
    },
    drop: ({ item, place, moved, x, y }) => {
      if (!moved) return item.drops.hold(item.key, { x, y })
      const source = rows.findIndex((row) =>
        row.tabs.some((tab) => rowKey(tab) === item.key),
      )
      const tab = rows[source]?.tabs.find((each) => rowKey(each) === item.key)
      const target = targetOf(place, rows, item.key)
      if (!tab || !target) return
      if (place.kind !== 'row' || place.row !== source) {
        props.onPaneMove(tab, target)
        return
      }
      const all = rows.flatMap((row) => row.tabs)
      const across = paneMoveOf(tab, target, all)
      const said = across ? movedStatus(tab.title, across.move) : ''
      item.drops.drop(tab, target, across ? { to: place.index, said } : null)
    },
  })
  // A tab that left the rows during its drag, such as by a close, shows no drag.
  const source = drag
    ? rows.findIndex((row) =>
        row.tabs.some((tab) => rowKey(tab) === drag.item.key),
      )
    : -1
  const tab = rows[source]?.tabs.find((each) => rowKey(each) === drag?.item.key)
  const dragged = drag && tab ? { ...drag, tab } : null

  const row = (at: number): TabRowDrag => {
    const item = (each: RowTab, index: number, drops: RowDrops) => {
      const key = rowKey(each)
      const ref = nodes.itemRef(key)
      const renaming = each.kind === 'session' && each.id === props.renaming
      if (!props.enabled || renaming) return { ref }
      const from: DropPlace = { kind: 'row', row: at, index, pane: each.pane }
      return {
        ...bind({ key, drops }, from),
        ref,
        className: classes(
          local.holdSurface,
          dragged?.item.key === key && tabDrag.placeholder,
        ),
      }
    }
    if (!dragged) {
      return {
        nodes,
        item,
        line: null,
        status: '',
        lifted: null,
        edge: null,
        dragging: false,
      }
    }
    const { place, x, box, moved } = dragged
    const here = place.kind === 'row' && place.row === at
    const own = at === source
    const move = own ? dragMove(place, rows, dragged.tab) : null
    return {
      nodes,
      item,
      line: here ? lineOf(place, rows[at].tabs, dragged.item.key) : null,
      status: move ? moveStatus(dragged.tab.title, move) : '',
      lifted: own
        ? { tab: dragged.tab, x, top: box.top + box.height * hang }
        : null,
      edge: here ? { x, moved } : null,
      dragging: true,
    }
  }

  /** The drop mark over the content under the row at `at`, if any. */
  const mark = (at: number): PaneMark | null => {
    const place = dragged?.place
    if (place?.kind === 'half') return at === source ? place.side : null
    if (place?.kind === 'pane')
      return rows[at]?.pane === place.pane ? 'pane' : null
    return null
  }

  /** The ref of the content under the row at `at`, which a drop measures. */
  const contentRef = (at: number): RefCallback<HTMLElement> =>
    contents.ref(String(at))

  return { row, mark, contentRef, dragging: dragged !== null }
}
