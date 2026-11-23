import type { LucideIcon } from 'lucide-react'
import { Archive, FolderInput, Pencil, UserRoundPen } from 'lucide-react'
import { linkItem } from '../workspace/linkCopy'

/** An action of the workspace menu that opens its choices beside the menu. */
export type Submenu = 'move' | 'reassign'

/** An action of the workspace menu. */
type WorkspaceAction = Submenu | 'rename' | 'copyLink' | 'archive'

/** What the person signed in may do to one workspace of the list. */
export type RowAccess = {
  /** The person is an admin of the org. */
  admin: boolean
  /** The person owns the workspace. */
  owner: boolean
  archived: boolean
  /** The org has another section, where the workspace can move. */
  otherSection: boolean
  /** Nothing in the org can change, as in a suspended org. */
  readOnly: boolean
  /**
   * The list shows the row under another row of its tree. It moves only
   * with its top-level row, so it has no Move to section.
   */
  nested?: boolean
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
 * use. Every row offers Copy link, which changes nothing, also an archived
 * row and a row of a read-only org. Members move and rename a workspace
 * that is not archived. Only admins reassign, and only the owner and the
 * admins archive. The archived row of an admin also offers Reassign to. An
 * org with one section offers no Move to section, and neither does a
 * nested row, which moves only with its tree. A read-only org offers only
 * Copy link. The mockups and the app read this one list. It holds no data
 * of a screen, so the app can import it.
 */
export function workspaceMenuItems(access: RowAccess): WorkspaceMenuItem[] {
  const reassign = action('reassign', 'Reassign to', UserRoundPen)
  const copyLink = action('copyLink', linkItem.label, linkItem.icon)
  if (access.readOnly) return [copyLink]
  if (access.archived) return access.admin ? [reassign, copyLink] : [copyLink]
  const items: WorkspaceMenuItem[] = []
  if (access.otherSection && access.nested !== true) {
    items.push(action('move', 'Move to section', FolderInput))
  }
  if (access.admin) items.push(reassign)
  items.push(action('rename', 'Rename', Pencil), copyLink)
  if (access.admin || access.owner) {
    items.push({ kind: 'divider' }, action('archive', 'Archive', Archive))
  }
  return items
}

/** The menu of the row offers Rename. */
export function renames(access: RowAccess): boolean {
  return workspaceMenuItems(access).some(
    (item) => item.kind === 'action' && item.action === 'rename',
  )
}
