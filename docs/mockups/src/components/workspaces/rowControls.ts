import type { Membership } from '../../fixtures/members'
import { sections, type SectionKey } from '../../fixtures/sections'
import type { MenuEntry } from '../common/Menu'
import { reassignMenu } from '../workspace/OwnerPicker'
import type { OpenSubmenu, RowControls } from './RowMenu'
import type { WorkspaceRow } from './sections'
import { renames, workspaceMenuOf, type Submenu } from './workspaceMenu'

/**
 * What a view draws on one row: the menu that a right click or the menu
 * keys opened, its field of Rename, or a hover.
 */
export type RowDrawing =
  | { kind: 'menu'; submenu?: Submenu }
  | { kind: 'rename'; value: string; selected: boolean }
  | { kind: 'hover' }

/** The one row that a view draws, and what it draws on it. */
export type RowFocus = { workspace: string; drawing: RowDrawing }

/** The list around a row. */
export type RowContext = {
  /** The person who looks at the list. Their role decides the actions. */
  viewer: Membership
  /** The sections of the list, which Move to section offers. */
  sections: readonly SectionKey[]
  /** The org is suspended, so each menu holds only Copy link. */
  readOnly: boolean
  /** The list opens a menu as a sheet, as on a phone, and has no hover. */
  sheet: boolean
}

/**
 * The sections of the list, where a workspace can move, with its own
 * section checked. Its own section changes nothing.
 */
function sectionChoices(
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

/**
 * The choices of the open submenu of a menu, level with its item, which is
 * the first or the second item of the menu.
 */
function submenuOf(
  kind: Submenu,
  row: WorkspaceRow,
  context: RowContext,
  entries: readonly MenuEntry[],
): OpenSubmenu {
  const { workspace } = row
  const at = entries.findIndex(
    (entry) => entry.kind === 'item' && entry.submenu === 'open',
  )
  const item = at > 0 ? 1 : 0
  if (kind === 'move') {
    return {
      label: 'Section',
      entries: sectionChoices(workspace.section, context.sections),
      item,
    }
  }
  return {
    label: 'Owner',
    entries: reassignMenu(workspace.owner),
    item,
    wide: true,
  }
}

/**
 * The drawn state of one row: the menu that a right click or the menu keys
 * opened, at the pointer or in a sheet, the field of Rename, or a hover.
 * Every row has a menu, because each menu holds Copy link. A row whose
 * person may not rename it draws no field.
 */
export function rowControls(
  row: WorkspaceRow,
  focus: RowFocus | undefined,
  context: RowContext,
): RowControls | undefined {
  const { workspace } = row
  const drawing = focus?.workspace === workspace.key ? focus.drawing : undefined
  if (!drawing) return undefined
  // A screen without hover draws none.
  if (drawing.kind === 'hover') {
    return context.sheet ? undefined : { hovered: true }
  }
  const submenu = drawing.kind === 'menu' ? drawing.submenu : undefined
  const access = {
    admin: context.viewer.role === 'admin',
    owner: workspace.owner === context.viewer.person,
    archived: row.status === 'archived',
    otherSection: context.sections.length > 1,
    readOnly: context.readOnly,
  }
  const entries = workspaceMenuOf(access, submenu)
  if (drawing.kind === 'rename') {
    // A row whose person may not rename it draws no field.
    if (!renames(access)) return undefined
    return { rename: { value: drawing.value, selected: drawing.selected } }
  }
  return {
    open: {
      at: context.sheet ? 'sheet' : 'pointer',
      label: workspace.name,
      entries,
      submenu: submenu && submenuOf(submenu, row, context, entries),
    },
  }
}
