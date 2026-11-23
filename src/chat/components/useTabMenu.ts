import { useCallback, useState } from 'react'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/workspace/WorkspaceTabs.module.css'
import { useLongPress } from '../../app/long-press'

import { opensMenu } from '../../shell/ui/menu-keys'
import type { MenuEntry, MenuPoint } from '../ui/Menu'
import type { OpenMenu } from '../ui/PointMenu'
import { tabMenuEntries, type TabMenuActions } from './tab-menu-items'
import { rowKey, type RowTab, type TabItemProps } from './tab-row'
import local from './tabs.module.css'

/** The menu opens this far below a tab, as the mockups draw it. */
const below = 4

/**
 * The menu of each tab. A right click opens it at the pointer. Shift and
 * F10, or the Menu key, on a focused tab opens it below the tab, through the
 * key handler of the tab, on every system. `open` opens it after a long
 * press of a drag that ends with no move. A read-only row leaves out each
 * item that changes the workspace, so a session tab keeps only Copy link
 * and its transcript copies, and a file or diff tab keeps only Copy path:
 * the temporary tab loses Keep open with its moves and the two closes.
 * That row binds no drag, so a finger opens the menu with the long press
 * of `useLongPress`, which lifts no tab. A tab with no item, such as
 * a file tab of a read-only row without Copy path, and a tab that shows its
 * rename field open no menu, so the browser shows its own.
 */
export function useTabMenu(
  props: {
    tabs: readonly RowTab[]
    readOnly: boolean
    renaming: string | null
  } & TabMenuActions,
) {
  const { tabs, readOnly } = props
  const [open, setOpen] = useState<{ key: string; at: MenuPoint } | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const show = useCallback(
    (key: string, at: MenuPoint) => setOpen({ key, at }),
    [],
  )
  const hold = useLongPress(show)
  const act = (action: () => void) => () => {
    close()
    action()
  }
  /** The entries of the menu of the tab at `index`, or none. */
  const entriesAt = (index: number): MenuEntry[] => {
    const tab = tabs[index]
    if (tab.kind === 'session' && tab.id === props.renaming) return []
    return tabMenuEntries(tabs, index, act, props, readOnly)
  }
  const openIndex = open
    ? tabs.findIndex((tab) => rowKey(tab) === open.key)
    : -1
  const entries = openIndex >= 0 ? entriesAt(openIndex) : []
  // A tab that leaves the row, starts to rename, or keeps no item, such as a
  // file tab without Copy path when the workspace turns read-only, closes its
  // menu, so the menu does not open again when the tab comes back.
  if (open && entries.length === 0) setOpen(null)
  const menu: OpenMenu | null =
    open && entries.length > 0
      ? { title: tabs[openIndex].title, at: open.at, entries }
      : null

  /** The props of the list item of the tab at `index`, over those of its drag. */
  const item = (
    tab: RowTab,
    index: number,
    base: TabItemProps,
  ): TabItemProps => {
    if (entriesAt(index).length === 0) return base
    const key = rowKey(tab)
    const held = readOnly ? hold(key) : null
    return {
      ...base,
      onPointerDown: held?.onPointerDown ?? base.onPointerDown,
      className: classes(
        base.className,
        held !== null && local.holdSurface,
        menu !== null && open?.key === key && styles.menuOpen,
      ),
      onContextMenu: (event) => {
        base.onContextMenu?.(event)
        held?.onContextMenu?.(event)
        // A drag or a hold stops the event while a finger holds the tab,
        // whose release opens the menu.
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
