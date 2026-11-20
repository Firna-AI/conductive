import type { ChangeKind } from '../../shared/generated/ChangeKind'
import type { FileEntryKind } from '../../shared/generated/FileEntryKind'
import type { MenuAction, MenuEntry } from '../../shell/ui/Menu'

/**
 * A row of All files or Changes, as the items of its row menu read it: the
 * real path and the kind of the file or the folder that it names. The menu
 * shows only labels. An item reads the real path at its press.
 */
export interface FileRowTarget {
  /** The real path from the root of the repository, such as `src/app.ts`. */
  path: string
  kind: FileEntryKind
  /**
   * The change of the file in the branch, as the row shows it, or null. A
   * row of Changes for a deleted file has `deleted`.
   */
  change: ChangeKind | null
}

/**
 * The items of the menu of a row, in groups that a line parts, such as Add
 * to chat, then Copy path. The shell gives them, so the Files screens hold
 * no item and no tie to the chat. A row with no item opens no menu.
 */
export type RowMenuItems = (
  row: FileRowTarget,
) => readonly (readonly MenuAction[])[]

/** A row of a list, as its row menu draws it. */
export interface MenuRow {
  /** The real path of the row, its key. The markup holds no real path. */
  path: string
  /** The name that the row shows, which titles its menu. */
  name: string
  /**
   * What the items of the row act on, or null when the label of the row
   * hides a secret value, as `hidesSecret` says. Such a row has no item.
   */
  target: FileRowTarget | null
}

/**
 * The entries of a row menu: the groups that keep an item, with a line
 * between two of them.
 */
export function menuEntries(
  groups: readonly (readonly MenuAction[])[],
): MenuEntry[] {
  const entries: MenuEntry[] = []
  for (const group of groups) {
    if (group.length === 0) continue
    if (entries.length > 0) entries.push({ kind: 'divider' })
    entries.push(...group)
  }
  return entries
}
