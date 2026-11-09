import { Archive, FolderInput, Pencil, UserRoundPen } from 'lucide-react'
import { sections, type SectionKey } from '../../fixtures/sections'
import type { MenuEntry } from '../common/Menu'

/** An action of the workspace menu that opens its choices beside the menu. */
export type Submenu = 'move' | 'reassign'

/** What the person signed in may do to one workspace of the list. */
export type RowAccess = {
  /** The person is an admin of the org. */
  admin: boolean
  /** The person owns the workspace. */
  owner: boolean
  archived: boolean
  /** The org has another section, where the workspace can move. */
  otherSection: boolean
}

/**
 * The menu of a workspace row, with only the actions that the person can
 * use. Members move and rename a workspace that is not archived. Only
 * admins reassign, and only the owner and the admins archive. The archived
 * row of an admin offers only Reassign to. An org with one section offers
 * no Move to section. An empty menu means no menu and no More, so a right
 * click keeps the browser's own menu. `open` is the submenu that shows its
 * choices.
 */
export function workspaceMenuOf(
  access: RowAccess,
  open?: Submenu,
): MenuEntry[] {
  const submenu = (kind: Submenu): 'open' | 'closed' =>
    open === kind ? 'open' : 'closed'
  const reassign: MenuEntry = {
    kind: 'item',
    label: 'Reassign to',
    icon: UserRoundPen,
    submenu: submenu('reassign'),
  }
  if (access.archived) return access.admin ? [reassign] : []
  const entries: MenuEntry[] = []
  if (access.otherSection) {
    entries.push({
      kind: 'item',
      label: 'Move to section',
      icon: FolderInput,
      submenu: submenu('move'),
    })
  }
  if (access.admin) entries.push(reassign)
  entries.push({ kind: 'item', label: 'Rename', icon: Pencil })
  if (access.admin || access.owner) {
    entries.push(
      { kind: 'divider' },
      { kind: 'item', label: 'Archive', icon: Archive },
    )
  }
  return entries
}

/**
 * The sections of the list, where a workspace can move, with its own
 * section checked. Its own section changes nothing.
 */
export function sectionChoices(
  current: SectionKey,
  keys: readonly SectionKey[],
): MenuEntry[] {
  return [
    { kind: 'label', label: 'Section' },
    ...keys.map((key): MenuEntry => ({
      kind: 'item',
      label: sections[key].name,
      checked: key === current,
    })),
  ]
}
