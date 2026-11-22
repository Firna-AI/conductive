import type { Viewport } from '@mokly/mokly'
import {
  archivedGroup,
  newOrgSections,
  suspendedSections,
  workspaceSections,
  type SidebarSection,
} from '../components/workspaces/sections'
import { viewerMembership } from '../fixtures/members'
import { checkoutAutocomplete } from '../fixtures/workspaces'
import { newOrgs } from './listStates'
import { queueListView, type QueueListView } from './queueStates'
import { subWorkspaceView } from './subWorkspaceStates'
import { isWorkspaceMenuState } from './workspaceMenuStates'
import {
  generalOnlySections,
  menuListView,
  type MenuListView,
} from './workspaceMenuView'
import type { WorkspaceListState } from './WorkspaceListScreen'

/** Cal, an admin of each org, who looks at the lists of these views. */
export const listViewer = viewerMembership('admin')

/** The sections of a list before any state changes them. */
export function sectionsOf(list: WorkspaceListState['list']): SidebarSection[] {
  if (list === 'general-only') return generalOnlySections()
  if (list === 'suspended') return suspendedSections()
  if (list === 'archived') return archivedGroup().sections
  return newOrgs[list] ? newOrgSections() : workspaceSections()
}

/**
 * The open Archived group of the `archived` list, with the pointer over
 * the row of the last archived workspace, whose Restore covers its time.
 * A phone draws no hover, because it has no pointer.
 */
export function archivedGroupView(): Pick<MenuListView, 'archived' | 'focus'> {
  return {
    archived: archivedGroup().archived,
    focus: { workspace: checkoutAutocomplete.key, drawing: { kind: 'hover' } },
  }
}

/**
 * The list and what lies over it, in a state of the merge queue, of
 * sub-workspaces, or of the menu of a row.
 */
export function stateView(
  state: WorkspaceListState,
  viewport: Viewport,
): QueueListView | undefined {
  const queue = queueListView(state.mergeQueue, viewport)
  if (queue) return queue
  const trees = subWorkspaceView(state.subWorkspaces, viewport)
  if (trees) return trees
  const { list, menu } = state
  if (!isWorkspaceMenuState(menu)) return undefined
  if (list !== 'workspaces' && list !== 'general-only' && list !== 'suspended')
    return undefined
  return menuListView(menu, list, viewport)
}
