import type { LucideIcon } from 'lucide-react'
import { Archive, FolderInput, Pencil, UserRoundPen } from 'lucide-react'
import type { MenuEntry } from '../common/Menu'

/** An action of the workspace menu that opens its choices beside the menu. */
export type Submenu = 'move' | 'reassign'

/** An action of the workspace menu. */
type WorkspaceAction = Submenu | 'rename' | 'archive'

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

/** One row of the workspace menu: an action, or the line before Archive. */
export type WorkspaceMenuItem =
  | {
      kind: 'action'
      action: WorkspaceAction
      label: string
      icon: LucideIcon
      /** The action opens its choices, such as the sections. */
      submenu: boolean
    }
  | { kind: 'divider' }

function action(
  kind: WorkspaceAction,
  label: string,
  icon: LucideIcon,
): WorkspaceMenuItem {
  const submenu = kind === 'move' || kind === 'reassign'
  return { kind: 'action', action: kind, label, icon, submenu }
}

/**
 * The menu of a workspace row, with only the actions that the person can
 * use. Members move and rename a workspace that is not archived. Only
 * admins reassign, and only the owner and the admins archive. The archived
 * row of an admin offers only Reassign to. An org with one section offers
 * no Move to section. An empty menu means no menu, so a right click keeps
 * the browser's own menu. The mockups and the app read this one list. It
 * holds no data of a screen, so the app can import it.
 */
export function workspaceMenuItems(access: RowAccess): WorkspaceMenuItem[] {
  const reassign = action('reassign', 'Reassign to', UserRoundPen)
  if (access.archived) return access.admin ? [reassign] : []
  const items: WorkspaceMenuItem[] = []
  if (access.otherSection) {
    items.push(action('move', 'Move to section', FolderInput))
  }
  if (access.admin) items.push(reassign)
  items.push(action('rename', 'Rename', Pencil))
  if (access.admin || access.owner) {
    items.push({ kind: 'divider' }, action('archive', 'Archive', Archive))
  }
  return items
}

/**
 * The menu of a workspace row as a view draws it. `open` is the submenu
 * that shows its choices.
 */
export function workspaceMenuOf(
  access: RowAccess,
  open?: Submenu,
): MenuEntry[] {
  return workspaceMenuItems(access).map((item): MenuEntry => {
    if (item.kind === 'divider') return item
    const entry: Extract<MenuEntry, { kind: 'item' }> = {
      kind: 'item',
      label: item.label,
      icon: item.icon,
    }
    if (!item.submenu) return entry
    return { ...entry, submenu: open === item.action ? 'open' : 'closed' }
  })
}
