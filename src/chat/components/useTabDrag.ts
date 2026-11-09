import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { usePointerDrag } from '../../app/pointer-drag'
import type { TabPlace } from '../state/tab-order'
import type { TabNodes } from './tab-nodes'
import { rowKey, viewTabOf, type RowTab, type TabItemProps } from './tab-row'
import local from './tabs.module.css'

/** What the row draws for a drag of a tab. */
export interface TabRowDrag {
  /** The props of the list item of the tab at `index` of the row. */
  item: (tab: RowTab, index: number) => TabItemProps
  /** The key of the tab that the drop line goes before, if any. */
  lineBefore: string | null
  /** The drop line goes after the last tab. */
  lineAtEnd: boolean
  /** What the status of the row tells a screen reader. */
  status: string
  /** The lifted tab, its centre, and its top, in CSS px of the window. */
  lifted: { tab: RowTab; x: number; top: number } | null
}

/** The lifted tab hangs below the row: its top is 70% down the tab. */
const hang = 0.7

/**
 * The move of the tab with `key` to the place `index` among the other tabs:
 * before the tab at that place, or after the last tab. Its own place moves
 * nothing.
 */
function moveTo(
  tabs: readonly RowTab[],
  key: string,
  index: number,
): TabPlace | null {
  const own = tabs.findIndex((tab) => rowKey(tab) === key)
  const others = tabs.filter((tab) => rowKey(tab) !== key)
  if (own < 0 || index === own) return null
  const next = others[index]
  if (next) return { before: viewTabOf(next) }
  const last = others.at(-1)
  return last ? { after: viewTabOf(last) } : null
}

/**
 * The drag of the tab row, on the shared pointer drag. A tab keeps its
 * place as a faint copy, a line that takes no space marks the drop place,
 * and a lifted copy hangs below the row under the pointer. The drop place is
 * before the first other tab whose middle is right of the pointer, else
 * after the last tab. A long press that ends with no move calls `onHold` at
 * the point of the press, for the tab menu. A read-only row binds no drag,
 * and neither does a tab that shows its rename field. A drag does not change
 * the shown tab.
 */
export function useTabDrag(props: {
  tabs: readonly RowTab[]
  nodes: TabNodes
  enabled: boolean
  renaming: string | null
  onMove: (tab: RowTab, place: TabPlace) => void
  onHold: (key: string, at: { x: number; y: number }) => void
}): TabRowDrag {
  const { tabs, nodes, onMove } = props
  const keys = tabs.map(rowKey)
  const { drag, bind } = usePointerDrag<string, number>({
    locate: (key, x) => nodes.placeAt(keys, key, x),
    drop: ({ item: key, place, moved, x, y }) => {
      if (!moved) {
        props.onHold(key, { x, y })
        return
      }
      const tab = tabs.find((item) => rowKey(item) === key)
      const to = moveTo(tabs, key, place)
      if (tab && to) onMove(tab, to)
    },
  })
  // A tab that left the row during its drag, such as by a close, shows no drag.
  const own = drag ? keys.indexOf(drag.item) : -1
  const dragged = drag && own >= 0 ? { ...drag, tab: tabs[own] } : null
  const item = (tab: RowTab, index: number): TabItemProps => {
    const key = rowKey(tab)
    const ref = nodes.itemRef(key)
    const renaming = tab.kind === 'session' && tab.id === props.renaming
    if (!props.enabled || renaming) return { ref }
    return {
      ...bind(key, index),
      ref,
      className: classes(
        local.dragSurface,
        dragged?.item === key && styles.placeholder,
      ),
    }
  }
  if (!dragged) {
    return {
      item,
      lineBefore: null,
      lineAtEnd: false,
      status: '',
      lifted: null,
    }
  }
  const { place, x, box } = dragged
  const others = keys.filter((key) => key !== dragged.item)
  const lineBefore = place === own ? dragged.item : (others[place] ?? null)
  return {
    item,
    lineBefore,
    lineAtEnd: lineBefore === null,
    status: `Moving ${dragged.tab.title} to place ${place + 1} of ${keys.length}`,
    lifted: { tab: dragged.tab, x, top: box.top + box.height * hang },
  }
}
