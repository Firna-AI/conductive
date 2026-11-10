import { useCallback, useState } from 'react'
import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { opensMenu } from '../../shell/ui/menu-keys'
import type { MenuEntry, MenuPoint } from '../ui/Menu'
import { rowKey, type RowTab, type TabItemProps } from './tab-row'

/** The open menu of a tab: its title, where it opens, and its items. */
export interface OpenTabMenu {
  title: string
  at: MenuPoint
  entries: MenuEntry[]
}

/** The menu opens this far below a tab, as the mockups draw it. */
const below = 4

/** The items of the menu of the tab at `index` of the row. */
function entriesOf(
  tabs: readonly RowTab[],
  index: number,
  act: (action: () => void) => () => void,
  actions: {
    onRename: (id: string) => void
    onStep: (tab: RowTab, by: -1 | 1) => void
  },
): MenuEntry[] {
  const tab = tabs[index]
  const moves: MenuEntry[] = [
    {
      kind: 'item',
      key: 'move-left',
      label: 'Move left',
      icon: ArrowLeft,
      disabled: index === 0,
      onSelect: act(() => actions.onStep(tab, -1)),
    },
    {
      kind: 'item',
      key: 'move-right',
      label: 'Move right',
      icon: ArrowRight,
      disabled: index === tabs.length - 1,
      onSelect: act(() => actions.onStep(tab, 1)),
    },
  ]
  if (tab.kind !== 'session') return moves
  return [
    {
      kind: 'item',
      key: 'rename',
      label: 'Rename session',
      icon: Pencil,
      onSelect: act(() => actions.onRename(tab.id)),
    },
    { kind: 'divider' },
    ...moves,
  ]
}

/**
 * The menu of each tab. A right click opens it at the pointer. Shift and
 * F10, or the Menu key, on a focused tab opens it below the tab, through the
 * key handler of the tab, on every system. `open` opens it after a long
 * press that ends with no move. A session tab leads with Rename session, and
 * every tab moves one place left or right. A move that the place of the tab
 * rules out is off. A read-only row and a tab that shows its rename field
 * open no menu, so the browser shows its own.
 */
export function useTabMenu(props: {
  tabs: readonly RowTab[]
  enabled: boolean
  renaming: string | null
  onRename: (id: string) => void
  onStep: (tab: RowTab, by: -1 | 1) => void
}) {
  const { tabs } = props
  const [open, setOpen] = useState<{ key: string; at: MenuPoint } | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const show = useCallback(
    (key: string, at: MenuPoint) => setOpen({ key, at }),
    [],
  )
  const binds = (tab: RowTab) =>
    props.enabled && !(tab.kind === 'session' && tab.id === props.renaming)
  const index = open ? tabs.findIndex((tab) => rowKey(tab) === open.key) : -1
  const tab = index >= 0 ? tabs[index] : undefined
  // A tab that leaves the row, or that starts to rename, closes its menu, so
  // the menu does not open again when the tab comes back.
  if (open && !(tab && binds(tab))) setOpen(null)
  const act = (action: () => void) => () => {
    close()
    action()
  }
  const menu: OpenTabMenu | null =
    open && tab && binds(tab)
      ? {
          title: tab.title,
          at: open.at,
          entries: entriesOf(tabs, index, act, props),
        }
      : null

  /** The props of the list item of the tab, over those of its drag. */
  const item = (tab: RowTab, base: TabItemProps): TabItemProps => {
    if (!binds(tab)) return base
    const key = rowKey(tab)
    return {
      ...base,
      className: classes(
        base.className,
        menu !== null && open?.key === key && styles.menuOpen,
      ),
      onContextMenu: (event) => {
        base.onContextMenu?.(event)
        // The drag stops the event while a finger holds the tab, whose
        // release opens the menu.
        if (event.defaultPrevented) return
        event.preventDefault()
        // A browser can also send this event after the keys that open it.
        if (open?.key !== key) show(key, { x: event.clientX, y: event.clientY })
      },
      onKeyDown: (event) => {
        base.onKeyDown?.(event)
        if (!opensMenu(event)) return
        event.preventDefault()
        const box = event.currentTarget.getBoundingClientRect()
        show(key, { x: box.left, y: box.bottom + below })
      },
    }
  }

  return { menu, item, open: show, close }
}
