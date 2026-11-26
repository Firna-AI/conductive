import { defined } from '../../defined'
import type { Membership } from '../../fixtures/members'
import { sections, type SectionKey } from '../../fixtures/sections'
import { iconKeyOf } from '../../entries/components/common/icons'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import type { OpenSubmenu } from '../common/PointMenu'
import { reassignMenu } from '../workspace/OwnerPicker'
import { queueLabels } from '../../../../../src/ui/components/workspace/queueCopy'
import type { RowControls } from './RowMenu'
import type { WorkspaceRow } from './sections'
import { isNested } from './trees'
import {
  renames,
  workspaceMenuItems,
  type RowAccess,
  type Submenu,
} from '../../../../../src/ui/components/workspaces/workspaceMenu'

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
  /**
   * The merge queue action of each row whose menu offers one, by the key
   * of its workspace. A list without it offers none.
   */
  queue?: ReadonlyMap<string, QueueMenuAction>
}

/**
 * The merge queue action of a workspace menu: Add to merge queue for a pull
 * request that can join, or Remove from queue for a queued workspace.
 */
export type QueueMenuAction = 'add' | 'remove'

/**
 * The menu with the item of the merge queue in the group of Archive, after
 * the line, or after a new line when the person may not archive. It needs
 * write access to the repository, as Merge does (decision 317).
 */
function withQueueItem(
  entries: readonly MenuEntryData[],
  action: QueueMenuAction,
): MenuEntryData[] {
  const item: MenuEntryData =
    action === 'add'
      ? { kind: 'item', label: queueLabels.add, icon: 'list-plus' }
      : { kind: 'item', label: queueLabels.remove, icon: 'list-x' }
  const line = entries.findIndex((entry) => entry.kind === 'divider')
  if (line < 0) return [...entries, { kind: 'divider' }, item]
  return entries.toSpliced(line + 1, 0, item)
}

/**
 * The sections of the list, where a workspace can move, with its own
 * section checked. Its own section changes nothing.
 */
function sectionChoices(
  current: SectionKey,
  keys: readonly SectionKey[],
): MenuEntryData[] {
  return [
    { kind: 'label', label: 'Section' },
    ...keys.map((key): MenuEntryData => ({
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
  entries: readonly MenuEntryData[],
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
 * The menu of a workspace as the registered menu takes it, on its row and
 * from the name in its header: the actions of `workspaceMenuItems`, with
 * the key of each icon. `open` is the submenu that shows its choices.
 * `queue` adds the item of the merge queue. A queued workspace shows only
 * in the Merge queue group, so its menu has no Move to section.
 */
export function workspaceMenuOf(
  access: RowAccess,
  open?: Submenu,
  queue?: QueueMenuAction,
): MenuEntryData[] {
  const queued = queue === 'remove'
  const items = workspaceMenuItems(
    queued ? { ...access, otherSection: false } : access,
  )
  const entries = items.map((item): MenuEntryData => {
    if (item.kind === 'divider') return item
    const entry = {
      kind: 'item',
      label: item.label,
      icon: iconKeyOf(item.icon),
    } as const
    if (!item.submenu) return entry
    return { ...entry, submenu: open === item.action ? 'open' : 'closed' }
  })
  return queue ? withQueueItem(entries, queue) : entries
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
    nested: isNested(row),
  }
  const queue = context.readOnly ? undefined : context.queue?.get(workspace.key)
  const entries = workspaceMenuOf(access, submenu, queue)
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
      ...defined({
        submenu: submenu && submenuOf(submenu, row, context, entries),
      }),
    },
  }
}
