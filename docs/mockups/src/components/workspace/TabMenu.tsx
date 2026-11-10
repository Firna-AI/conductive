import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ArrowRight, Copy, CopyPlus, Pencil } from 'lucide-react'
import { Menu, type MenuEntry } from '../common/Menu'
import { Sheet } from '../common/Sheet'
import type { WorkspaceTab } from './TabItem'
import { transcriptItems } from './transcriptCopy'

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
 * The menu of a tab: a right click opens it, and on a phone a long press
 * that ends without a move. A session tab leads with Rename session, the
 * one way to rename a session. Its two copy items follow: the concise copy,
 * with each fold of the chat closed, and the full copy, with every fold
 * open. Every tab moves one place left or right. A move that the place of
 * the tab rules out keeps its place, off. A read-only workspace leaves out
 * each item that changes the workspace, so a session tab keeps only its
 * copy items, and a file or diff tab has no menu.
 */
export function tabMenuOf(
  tabs: readonly WorkspaceTab[],
  key: string,
  readOnly: boolean,
): readonly MenuEntry[] {
  const index = tabs.findIndex((tab) => tab.key === key)
  const tab = tabs[index]
  if (!tab) return []
  const moves: TabMenuItem[] = [
    {
      label: 'Move left',
      icon: ArrowLeft,
      disabled: index === 0,
      changes: true,
    },
    {
      label: 'Move right',
      icon: ArrowRight,
      disabled: index === tabs.length - 1,
      changes: true,
    },
  ]
  const groups: TabMenuItem[][] =
    tab.kind === 'session'
      ? [
          [{ label: 'Rename session', icon: Pencil, changes: true }],
          [
            { label: transcriptItems.concise, icon: Copy, changes: false },
            { label: transcriptItems.full, icon: CopyPlus, changes: false },
          ],
          moves,
        ]
      : [moves]
  return joined(
    groups.map((group) => group.filter((item) => !readOnly || !item.changes)),
  )
}

/**
 * The tab menu of a phone: a sheet with the title of the tab. A tab whose
 * menu has no item, such as a file tab of a read-only workspace, opens none.
 */
export function TabMenuSheet(props: {
  tabs: readonly WorkspaceTab[]
  tab: string
  readOnly: boolean
}) {
  const tab = props.tabs.find((item) => item.key === props.tab)
  if (!tab) return null
  const entries = tabMenuOf(props.tabs, tab.key, props.readOnly)
  if (entries.length === 0) return null
  return (
    <Sheet title={tab.title}>
      <Menu entries={entries} label={tab.title} placement="sheet" />
    </Sheet>
  )
}
