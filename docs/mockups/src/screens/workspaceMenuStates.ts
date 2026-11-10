import type { RowDrawing } from '../components/workspaces/rowControls'
import type { Submenu } from '../components/workspaces/workspaceMenu'
import { workspaceList } from '../fixtures/workspaces'
import {
  archivedTarget,
  memberTarget,
  menuTarget,
  renameDraft,
  stoppedTarget,
} from '../fixtures/workspaceMenu'

/**
 * The states of the menu of a workspace row, as values of the `menu` prop
 * of the list: the menu at the pointer of a right click, its section and
 * owner choices, the field of Rename and its failed save, Archive from the
 * list, also of a stopped workspace, and Restore from its toast, the menus
 * of a member and of an admin on an archived row, and the hover of a row
 * without a menu.
 */
export const workspaceMenuStates = [
  'workspace',
  'workspace-move',
  'workspace-reassign',
  'workspace-rename',
  'workspace-rename-failed',
  'workspace-archive',
  'workspace-archive-stopped',
  'workspace-restored',
  'workspace-member',
  'workspace-own',
  'workspace-archived-row',
  'workspace-archived-member',
  'workspace-hover',
] as const

export type WorkspaceMenuState = (typeof workspaceMenuStates)[number]

export function isWorkspaceMenuState(menu: string): menu is WorkspaceMenuState {
  return workspaceMenuStates.some((state) => state === menu)
}

type Focus = { workspace: string; drawing: RowDrawing }

/**
 * One state: Priya, a member who is not an admin, or else Cal, an admin.
 * The row that the view draws, and the Archived group: open, just after
 * the Archive of `target`, or after its Restore. `target` is Apple Pay
 * button unless the state names another workspace. And what lies over the
 * list: the toast after Archive, or the toast of a failed rename.
 */
export type Scenario = {
  member?: boolean
  focus?: Focus
  archived?: 'open' | 'after-archive' | 'restored'
  target?: string
  over?: 'archived' | 'rename-failed'
}

function atPointer(workspace: string, submenu?: Submenu): Focus {
  return { workspace, drawing: { kind: 'menu', submenu } }
}

function hovered(workspace: string): Focus {
  return { workspace, drawing: { kind: 'hover' } }
}

const targetName =
  workspaceList.find((item) => item.key === menuTarget)?.name ?? ''

export const scenarios: Readonly<Record<WorkspaceMenuState, Scenario>> = {
  workspace: { focus: atPointer(menuTarget) },
  'workspace-move': { focus: atPointer(menuTarget, 'move') },
  'workspace-reassign': { focus: atPointer(menuTarget, 'reassign') },
  'workspace-rename': {
    focus: {
      workspace: menuTarget,
      drawing: { kind: 'rename', value: targetName, selected: true },
    },
  },
  'workspace-rename-failed': {
    focus: {
      workspace: menuTarget,
      drawing: { kind: 'rename', value: renameDraft, selected: false },
    },
    over: 'rename-failed',
  },
  'workspace-archive': { archived: 'after-archive', over: 'archived' },
  'workspace-archive-stopped': {
    archived: 'after-archive',
    target: stoppedTarget,
    over: 'archived',
  },
  'workspace-restored': { archived: 'restored' },
  'workspace-member': { member: true, focus: atPointer(menuTarget) },
  'workspace-own': { member: true, focus: atPointer(memberTarget) },
  'workspace-archived-row': {
    archived: 'open',
    focus: atPointer(archivedTarget),
  },
  'workspace-archived-member': {
    member: true,
    archived: 'open',
    focus: hovered(archivedTarget),
  },
  'workspace-hover': { focus: hovered(menuTarget) },
}
