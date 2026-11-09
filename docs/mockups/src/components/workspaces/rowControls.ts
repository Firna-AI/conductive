import { you, type PersonKey } from '../../fixtures/members'
import type { SectionKey } from '../../fixtures/sections'
import { menuTarget } from '../../fixtures/workspaceMenu'
import { paths } from '../../paths'
import type { MenuEntry } from '../common/Menu'
import { reassignMenu } from '../workspace/OwnerPicker'
import type { OpenSubmenu, RowControls } from './RowMenu'
import type { WorkspaceRow } from './sections'
import { sectionChoices, workspaceMenuOf, type Submenu } from './workspaceMenu'

/** What a view draws on one row: its open menu, its field, or a hover. */
export type RowDrawing =
  | { kind: 'menu'; at: 'pointer' | 'more'; submenu?: Submenu }
  | { kind: 'rename'; value: string; selected: boolean }
  | { kind: 'hover' }

/** The person who looks at a list, and the one row that a view draws. */
export type ListRows = {
  viewer: PersonKey
  /** The person is an admin of the org. */
  admin: boolean
  focus?: { workspace: string; drawing: RowDrawing }
}

/** Cal, an admin of each org, as the canonical views draw the list. */
export const adminRows: ListRows = { viewer: you, admin: true }

/** The list around a row. */
export type RowContext = {
  /** The sections of the list, which Move to section offers. */
  sections: readonly SectionKey[]
  /** The org is suspended, so no row has a menu. */
  readOnly: boolean
  /** The screen has no hover: More shows on every row, and a sheet opens. */
  touch: boolean
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
 * More and the drawn state of one row. The canonical row of the menu, when
 * the view draws nothing on it, links More to its open menu.
 */
export function rowControls(
  row: WorkspaceRow,
  rows: ListRows,
  context: RowContext,
): RowControls {
  const { workspace } = row
  const drawing =
    rows.focus?.workspace === workspace.key ? rows.focus.drawing : undefined
  const submenu = drawing?.kind === 'menu' ? drawing.submenu : undefined
  const entries = context.readOnly
    ? []
    : workspaceMenuOf(
        {
          admin: rows.admin,
          owner: workspace.owner === rows.viewer,
          archived: row.status === 'archived',
          otherSection: context.sections.length > 1,
        },
        submenu,
      )
  const controls: RowControls = {
    more: entries.length > 0,
    touch: context.touch,
    moreTo:
      workspace.key === menuTarget && !drawing
        ? paths.workspaceMenuMore
        : undefined,
  }
  // A row without an action has no menu and no field: a right click opens
  // the browser's own menu.
  switch (drawing?.kind) {
    case undefined:
      return controls
    case 'hover':
      // A screen without hover draws none.
      return context.touch ? controls : { ...controls, hovered: true }
    case 'rename':
      if (!controls.more) return controls
      return {
        ...controls,
        rename: { value: drawing.value, selected: drawing.selected },
      }
    case 'menu':
      if (!controls.more) return controls
      return {
        ...controls,
        open: {
          at: drawing.at,
          label: workspace.name,
          entries,
          submenu: submenu && submenuOf(submenu, row, context, entries),
        },
      }
  }
}
