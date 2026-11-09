import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react'
import { Menu, type MenuEntry } from '../common/Menu'
import { Sheet } from '../common/Sheet'
import type { WorkspaceTab } from './TabItem'

/**
 * The menu of a tab: a right click opens it, and on a phone a long press
 * that ends without a move. A session tab leads with Rename session, the
 * one way to rename a session. Every tab moves one place left or right. A
 * move that the place of the tab rules out stays in its place, off.
 */
export function tabMenuOf(
  tabs: readonly WorkspaceTab[],
  key: string,
): readonly MenuEntry[] {
  const index = tabs.findIndex((tab) => tab.key === key)
  const tab = tabs[index]
  if (!tab) return []
  const moves: readonly MenuEntry[] = [
    {
      kind: 'item',
      label: 'Move left',
      icon: ArrowLeft,
      disabled: index === 0,
    },
    {
      kind: 'item',
      label: 'Move right',
      icon: ArrowRight,
      disabled: index === tabs.length - 1,
    },
  ]
  if (tab.kind !== 'session') return moves
  return [
    { kind: 'item', label: 'Rename session', icon: Pencil },
    { kind: 'divider' },
    ...moves,
  ]
}

/** The tab menu of a phone: a sheet with the title of the tab. */
export function TabMenuSheet(props: {
  tabs: readonly WorkspaceTab[]
  tab: string
}) {
  const tab = props.tabs.find((item) => item.key === props.tab)
  if (!tab) return null
  return (
    <Sheet title={tab.title}>
      <Menu
        entries={tabMenuOf(props.tabs, tab.key)}
        label={tab.title}
        placement="sheet"
      />
    </Sheet>
  )
}
