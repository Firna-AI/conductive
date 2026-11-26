import type { TranscriptDetail } from '../../shared/generated/TranscriptDetail'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  Copy,
  CopyPlus,
  Pencil,
  X,
} from 'lucide-react'
import { copyPathItem } from '../../ui/components/files/rowMenuCopy'
import { linkItem } from '../../ui/components/workspace/linkCopy'
import { transcriptItems } from '../../ui/components/workspace/transcriptCopy'
import type { MenuEntry } from '../ui/Menu'
import type { RowTab } from './tab-row'

/** An item of the tab menu, and whether it changes the workspace. */
interface TabMenuItem {
  entry: Extract<MenuEntry, { kind: 'item' }>
  /**
   * The item changes the workspace, such as a rename or a move. A read-only
   * row leaves out each marked item, so an item that changes nothing, such
   * as a copy, shows there with no rule of its own.
   */
  changes: boolean
}

/** What the items of the tab menu do. */
export interface TabMenuActions {
  onRename: (id: string) => void
  onStep: (tab: RowTab, by: -1 | 1) => void
  /** Closes every tab but the tab, as Close other tabs says. */
  onCloseOthers: (tab: RowTab) => void
  /** Closes every tab after the tab, as Close tabs to the right says. */
  onCloseRight: (tab: RowTab) => void
  /** Keeps the temporary tab in its place, through the `keep` of its host. */
  onKeep: (tab: RowTab) => void
  /** Copies the transcript of a session, during the press of its item. */
  onCopy: (id: string, detail: TranscriptDetail) => void
  /**
   * Copies the link of a session, during the press of its item. Without
   * it, as before the workspace loads, the menu has no Copy link.
   */
  onCopyLink?: (id: string) => void
}

/** The icon of each copy item, as the mockups draw it. */
const copyIcons: Readonly<Record<TranscriptDetail, LucideIcon>> = {
  concise: Copy,
  full: CopyPlus,
}

/**
 * The groups of items of the menu of the tab at `index` of the row. A
 * session tab has Rename session, Copy link and its two transcript copies,
 * and the moves. The temporary tab has Keep open, Copy path when it is a
 * file or diff tab, and the moves. A kept file or diff tab has Copy path
 * and the moves, and a kept skill tab has the moves. A tab whose host gives
 * no `copyPath` has no Copy path: a skill tab, which has no path, and a
 * file or diff tab whose label hides a secret value. Every tab ends with
 * Close other tabs and Close tabs to the right. A move or a close that the
 * row rules out is off.
 */
function groupsOf(
  tabs: readonly RowTab[],
  index: number,
  act: (action: () => void) => () => void,
  actions: TabMenuActions,
): TabMenuItem[][] {
  const tab = tabs[index]
  const moves: TabMenuItem[] = [
    {
      entry: {
        kind: 'item',
        key: 'move-left',
        label: 'Move left',
        icon: ArrowLeft,
        disabled: index === 0,
        onSelect: act(() => actions.onStep(tab, -1)),
      },
      changes: true,
    },
    {
      entry: {
        kind: 'item',
        key: 'move-right',
        label: 'Move right',
        icon: ArrowRight,
        disabled: index === tabs.length - 1,
        onSelect: act(() => actions.onStep(tab, 1)),
      },
      changes: true,
    },
  ]
  const closes: TabMenuItem[] = [
    {
      entry: {
        kind: 'item',
        key: 'close-others',
        label: 'Close other tabs',
        icon: X,
        disabled: tabs.length === 1,
        onSelect: act(() => actions.onCloseOthers(tab)),
      },
      changes: true,
    },
    {
      entry: {
        kind: 'item',
        key: 'close-right',
        label: 'Close tabs to the right',
        icon: X,
        disabled: index === tabs.length - 1,
        onSelect: act(() => actions.onCloseRight(tab)),
      },
      changes: true,
    },
  ]
  if (tab.kind === 'host') {
    // A copy changes nothing, so a read-only row keeps Copy path.
    const { copyPath } = tab
    const copy: TabMenuItem[] = copyPath
      ? [
          {
            entry: {
              kind: 'item',
              key: 'copy-path',
              ...copyPathItem,
              onSelect: act(copyPath),
            },
            changes: false,
          },
        ]
      : []
    if (tab.keep === null) return [copy, moves, closes]
    // The icon is a bookmark with a check, as the mockups draw it, because
    // a pin names the pinned tabs of a browser.
    const keep: TabMenuItem = {
      entry: {
        kind: 'item',
        key: 'keep-open',
        label: 'Keep open',
        icon: BookmarkCheck,
        onSelect: act(() => actions.onKeep(tab)),
      },
      changes: true,
    }
    return [[keep], copy, moves, closes]
  }
  const copy = (detail: TranscriptDetail): TabMenuItem => ({
    entry: {
      kind: 'item',
      key: `copy-${detail}`,
      label: transcriptItems[detail],
      icon: copyIcons[detail],
      onSelect: act(() => actions.onCopy(tab.id, detail)),
    },
    changes: false,
  })
  const { onCopyLink } = actions
  const link: TabMenuItem[] = onCopyLink
    ? [
        {
          entry: {
            kind: 'item',
            key: 'copy-link',
            ...linkItem,
            onSelect: act(() => onCopyLink(tab.id)),
          },
          changes: false,
        },
      ]
    : []
  const rename: TabMenuItem = {
    entry: {
      kind: 'item',
      key: 'rename',
      label: 'Rename session',
      icon: Pencil,
      onSelect: act(() => actions.onRename(tab.id)),
    },
    changes: true,
  }
  return [[rename], [...link, copy('concise'), copy('full')], moves, closes]
}

/**
 * The entries of the menu of the tab at `index`: the items that the row
 * allows, with a line between two groups that keep an item. A read-only
 * row leaves out each item that changes the workspace. `act` wraps the
 * press of each item, such as to close the menu first.
 */
export function tabMenuEntries(
  tabs: readonly RowTab[],
  index: number,
  act: (action: () => void) => () => void,
  actions: TabMenuActions,
  readOnly: boolean,
): MenuEntry[] {
  const entries: MenuEntry[] = []
  for (const group of groupsOf(tabs, index, act, actions)) {
    const kept = group.filter((item) => !readOnly || !item.changes)
    if (kept.length === 0) continue
    if (entries.length > 0) entries.push({ kind: 'divider' })
    entries.push(...kept.map((item) => item.entry))
  }
  return entries
}
