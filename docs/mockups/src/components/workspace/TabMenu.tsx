import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  Columns2,
  Copy,
  CopyPlus,
  Pencil,
  X,
} from 'lucide-react'
import { Menu, type MenuEntry } from '../common/Menu'
import { Sheet } from '../common/Sheet'
import { linkItem } from './linkCopy'
import { paneItems } from './paneCopy'
import type { WorkspaceTab } from './TabItem'
import { transcriptItems } from './transcriptCopy'

/**
 * Where the menu of a tab opens. `split` says that the centre column shows
 * two panes. `phone` draws the one row of a phone, and `border` is the
 * index of the first tab of the right pane in that row. A read-only
 * workspace leaves out each item that changes the workspace.
 */
export type MenuPlace = {
  readOnly: boolean
  split: boolean
  phone: boolean
  border?: number
}

/** An item of the menu of a tab. */
type TabMenuItem = {
  label: string
  icon: LucideIcon
  /** The place of the tab rules the item out, so it shows greyed. */
  disabled?: boolean
  /**
   * The item changes the workspace, such as a rename or a move. A read-only
   * workspace leaves out each marked item, so an item that only reads, such
   * as a copy, shows there with no rule of its own.
   */
  changes: boolean
}

/** The groups that keep an item, with a line between two groups. */
function joined(groups: readonly (readonly TabMenuItem[])[]): MenuEntry[] {
  const entries: MenuEntry[] = []
  for (const group of groups) {
    if (group.length === 0) continue
    if (entries.length > 0) entries.push({ kind: 'divider' })
    for (const item of group) {
      const { label, icon, disabled } = item
      entries.push({ kind: 'item', label, icon, disabled })
    }
  }
  return entries
}

/**
 * Keeps the temporary tab as a normal tab, as a double-click on the tab
 * does (decision 286). Its icon is a bookmark with a check, because a pin
 * names the pinned tabs of a browser and of VS Code.
 */
const keepOpen: TabMenuItem = {
  label: 'Keep open',
  icon: BookmarkCheck,
  changes: true,
}

/**
 * The groups of the menu of a tab, before a read-only workspace leaves
 * items out: a session tab has Rename session, Copy link and its two
 * transcript copies, and the moves. The temporary tab has Keep open and
 * the moves, and a kept file or diff tab has only the moves. Every tab ends
 * with Close tabs to the right.
 */
function groupsOf(
  tab: WorkspaceTab,
  moves: readonly TabMenuItem[],
  closeRight: readonly TabMenuItem[],
): readonly (readonly TabMenuItem[])[] {
  if (tab.kind === 'session') {
    return [
      [{ label: 'Rename session', icon: Pencil, changes: true }],
      [
        { ...linkItem, changes: false },
        { label: transcriptItems.concise, icon: Copy, changes: false },
        { label: transcriptItems.full, icon: CopyPlus, changes: false },
      ],
      moves,
      closeRight,
    ]
  }
  return tab.temporary ? [[keepOpen], moves, closeRight] : [moves, closeRight]
}

/**
 * The item that moves a tab between panes (split panes decision 4 B). With
 * two panes, it moves the tab to the end of the row of the other pane, as a
 * drop on the content of that pane does. With one pane, it opens the second
 * pane on the right with the tab, so it is off when the tab is the only tab
 * of the pane. A phone shows one row, so the item is off there.
 */
function paneItemOf(
  tabs: readonly WorkspaceTab[],
  place: MenuPlace,
): TabMenuItem {
  return {
    label: place.split ? paneItems.move : paneItems.open,
    icon: Columns2,
    disabled: place.phone || (!place.split && tabs.length === 1),
    changes: true,
  }
}

/**
 * The menu of a tab: a right click opens it, and on a phone a long press
 * that ends without a move. A session tab leads with Rename session, the
 * one way to rename a session. Its copy items follow: Copy link, which
 * copies the link of the session, the concise copy, with each fold of the
 * chat closed, and the full copy, with every fold open. The temporary tab
 * leads with Keep open. Every tab moves one place left or right, and moves
 * to the other pane or opens in a new pane. It closes every tab after it in
 * the row of its pane, as Close tabs to the right of a browser does. A move
 * or a close that the place of the tab rules out keeps its place, off. A
 * read-only workspace leaves out each item that changes the workspace, so a
 * session tab keeps only its copy items, and a file or diff tab has no
 * menu.
 */
export function tabMenuOf(
  tabs: readonly WorkspaceTab[],
  key: string,
  place: MenuPlace,
): readonly MenuEntry[] {
  const index = tabs.findIndex((tab) => tab.key === key)
  const tab = tabs[index]
  if (!tab) return []
  const last = index === tabs.length - 1
  const moves: TabMenuItem[] = [
    {
      label: 'Move left',
      icon: ArrowLeft,
      disabled: index === 0,
      changes: true,
    },
    { label: 'Move right', icon: ArrowRight, disabled: last, changes: true },
    paneItemOf(tabs, place),
  ]
  // The one row of a phone ends the left pane before its border.
  const lastOfPane = last || index + 1 === place.border
  const closeRight: TabMenuItem[] = [
    {
      label: 'Close tabs to the right',
      icon: X,
      disabled: lastOfPane,
      changes: true,
    },
  ]
  return joined(
    groupsOf(tab, moves, closeRight).map((group) =>
      group.filter((item) => !place.readOnly || !item.changes),
    ),
  )
}

/**
 * The tab menu of a phone: a sheet with the title of the tab. `tabs` is the
 * one row, with the tabs of both panes of a split. A tab whose menu has no
 * item, such as a file tab of a read-only workspace, opens none.
 */
export function TabMenuSheet(props: {
  tabs: readonly WorkspaceTab[]
  tab: string
  place: MenuPlace
}) {
  const tab = props.tabs.find((item) => item.key === props.tab)
  if (!tab) return null
  const entries = tabMenuOf(props.tabs, tab.key, props.place)
  if (entries.length === 0) return null
  return (
    <Sheet title={tab.title}>
      <Menu entries={entries} label={tab.title} placement="sheet" />
    </Sheet>
  )
}
