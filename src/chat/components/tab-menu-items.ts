import type { TranscriptDetail } from '../../shared/generated/TranscriptDetail'
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
import { linkItem } from '../../../docs/mockups/src/components/workspace/linkCopy'
import { paneItems } from '../../../docs/mockups/src/components/workspace/paneCopy'
import { transcriptItems } from '../../../docs/mockups/src/components/workspace/transcriptCopy'
import type { MenuEntry } from '../ui/Menu'
import type { PaneItem } from './pane-moves'
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
  /** The pane item, as `PaneItem` says. */
  pane: PaneItem
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
 * The moves of the tab at `index`: Move left, Move right, and the pane item
 * (split panes decision 4 B). The pane item reads Move to the other pane
 * with two panes, and Open in a new pane with one pane. It is off where it
 * has no move, as on a phone, and when the tab is the only tab of the only
 * pane. Its icon is the two columns of the mockups, which differ from the
 * icon of the right column.
 */
function movesOf(
  tabs: readonly RowTab[],
  index: number,
  act: (action: () => void) => () => void,
  actions: TabMenuActions,
): TabMenuItem[] {
  const tab = tabs[index]
  const { split, move } = actions.pane
  const item = (
    key: string,
    label: string,
    icon: LucideIcon,
    disabled: boolean,
    action: () => void,
  ): TabMenuItem => ({
    entry: { kind: 'item', key, label, icon, disabled, onSelect: act(action) },
    changes: true,
  })
  return [
    item('move-left', 'Move left', ArrowLeft, index === 0, () =>
      actions.onStep(tab, -1),
    ),
    item(
      'move-right',
      'Move right',
      ArrowRight,
      index === tabs.length - 1,
      () => actions.onStep(tab, 1),
    ),
    item(
      'move-pane',
      split ? paneItems.move : paneItems.open,
      Columns2,
      move === null || (!split && tabs.length === 1),
      () => move?.(tab),
    ),
  ]
}

/**
 * The groups of items of the menu of the tab at `index` of the row. A
 * session tab has Rename session, Copy link and its two transcript copies,
 * and the moves. The temporary tab has Keep open and the moves, and a kept
 * file or diff tab has the moves. Every tab ends with Close tabs to the
 * right. A move or a close that the place of the tab rules out is off.
 */
export function groupsOf(
  tabs: readonly RowTab[],
  index: number,
  act: (action: () => void) => () => void,
  actions: TabMenuActions,
): TabMenuItem[][] {
  const tab = tabs[index]
  const moves = movesOf(tabs, index, act, actions)
  const closeRight: TabMenuItem[] = [
    {
      entry: {
        kind: 'item',
        key: 'close-right',
        label: 'Close tabs to the right',
        icon: X,
        // The one row of a phone ends the left pane at its line.
        disabled: tabs[index + 1]?.pane !== tab.pane,
        onSelect: act(() => actions.onCloseRight(tab)),
      },
      changes: true,
    },
  ]
  if (tab.kind === 'host') {
    if (tab.keep === null) return [moves, closeRight]
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
    return [[keep], moves, closeRight]
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
  return [[rename], [...link, copy('concise'), copy('full')], moves, closeRight]
}

/**
 * The entries of a menu: the items that the row allows, with a line between
 * two groups that keep an item. A read-only row leaves out each item that
 * changes the workspace.
 */
export function entriesOf(
  groups: readonly (readonly TabMenuItem[])[],
  readOnly: boolean,
): MenuEntry[] {
  const entries: MenuEntry[] = []
  for (const group of groups) {
    const kept = group.filter((item) => !readOnly || !item.changes)
    if (kept.length === 0) continue
    if (entries.length > 0) entries.push({ kind: 'divider' })
    entries.push(...kept.map((item) => item.entry))
  }
  return entries
}
