import { defined } from '../../defined'
import { iconKeyOf, type IconKey } from '../../entries/components/common/icons'
import { menu } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { sheet } from '../../entries/components/common/Sheet.mockup'
import { copyPathItem } from '../../../../../src/ui/components/files/rowMenuCopy'
import { linkItem } from '../../../../../src/ui/components/workspace/linkCopy'
import type { WorkspaceTab } from './TabItem'
import { transcriptItems } from '../../../../../src/ui/components/workspace/transcriptCopy'

/** An item of the menu of a tab. */
type TabMenuItem = {
  label: string
  icon: IconKey
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
function joined(groups: readonly (readonly TabMenuItem[])[]): MenuEntryData[] {
  const entries: MenuEntryData[] = []
  for (const group of groups) {
    if (group.length === 0) continue
    if (entries.length > 0) entries.push({ kind: 'divider' })
    for (const item of group) {
      const { label, icon, disabled } = item
      entries.push({ kind: 'item', label, icon, ...defined({ disabled }) })
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
  icon: 'bookmark-check',
  changes: true,
}

/**
 * Copies the path of the file of a file or diff tab, from the root of the
 * repository, as the Copy path item of a row of the Files panel does
 * (decision 3 B of the file row menu change). A copy changes nothing.
 */
const copyPath: TabMenuItem = {
  label: copyPathItem.label,
  icon: iconKeyOf(copyPathItem.icon),
  changes: false,
}

/**
 * The groups of the menu of a tab, before a read-only workspace leaves
 * items out: a session tab has Rename session, Copy link and its two
 * transcript copies, and the moves. A file or diff tab has Copy path and
 * the moves, and the temporary tab leads with Keep open. A tab whose label
 * can hide a secret value leaves out Copy path (decision 2 A of the file
 * row menu change). A skill tab has no path, so it leaves out Copy path.
 * Every tab ends with Close other tabs and Close tabs to the right.
 */
function groupsOf(
  tab: WorkspaceTab,
  moves: readonly TabMenuItem[],
  closes: readonly TabMenuItem[],
): readonly (readonly TabMenuItem[])[] {
  if (tab.kind === 'session') {
    return [
      [{ label: 'Rename session', icon: 'pencil', changes: true }],
      [
        {
          label: linkItem.label,
          icon: iconKeyOf(linkItem.icon),
          changes: false,
        },
        { label: transcriptItems.concise, icon: 'copy', changes: false },
        { label: transcriptItems.full, icon: 'copy-plus', changes: false },
      ],
      moves,
      closes,
    ]
  }
  const copy = tab.hidesPath === true || tab.kind === 'skill' ? [] : [copyPath]
  const file = [copy, moves, closes]
  return tab.temporary ? [[keepOpen], ...file] : file
}

/**
 * The menu of a tab: a right click opens it, and on a phone a long press
 * that ends without a move. A session tab leads with Rename session, the
 * one way to rename a session. Its copy items follow: Copy link, which
 * copies the link of the session, the concise copy, with each fold of the
 * chat closed, and the full copy, with every fold open. The temporary tab
 * leads with Keep open. A file or diff tab has Copy path, which copies the
 * path of its file, and a skill tab has none. Every tab moves one place
 * left or right. As in a browser, Close other tabs closes every tab but
 * it, and Close tabs to the right closes every tab after it. A move or a
 * close that the place of the tab rules out keeps its place, off. A
 * read-only workspace leaves out each item that changes the workspace, so
 * a session tab keeps only its copy items, and a file or diff tab keeps
 * only Copy path.
 */
export function tabMenuOf(
  tabs: readonly WorkspaceTab[],
  key: string,
  readOnly: boolean,
): readonly MenuEntryData[] {
  const index = tabs.findIndex((tab) => tab.key === key)
  const tab = tabs[index]
  if (!tab) return []
  const moves: TabMenuItem[] = [
    {
      label: 'Move left',
      icon: 'arrow-left',
      disabled: index === 0,
      changes: true,
    },
    {
      label: 'Move right',
      icon: 'arrow-right',
      disabled: index === tabs.length - 1,
      changes: true,
    },
  ]
  const closes: TabMenuItem[] = [
    {
      label: 'Close other tabs',
      icon: 'x',
      disabled: tabs.length === 1,
      changes: true,
    },
    {
      label: 'Close tabs to the right',
      icon: 'x',
      disabled: index === tabs.length - 1,
      changes: true,
    },
  ]
  return joined(
    groupsOf(tab, moves, closes).map((group) =>
      group.filter((item) => !readOnly || !item.changes),
    ),
  )
}

/**
 * The tab menu of a phone: a sheet with the title of the tab. A tab whose
 * menu has no item, such as a file tab of a read-only workspace whose label
 * can hide a secret value, opens none.
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
    <sheet.Component moklyInstance="tab-menu-sheet" title={tab.title}>
      <menu.Component
        entries={entries}
        label={tab.title}
        moklyInstance="tab-menu"
        placement="sheet"
      />
    </sheet.Component>
  )
}
