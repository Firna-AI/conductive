import type { ReactNode } from 'react'
import {
  archivedWithImport,
  sectionsWithImport,
} from '../components/workspaces/importSections'
import {
  archivedSections,
  suspendedSections,
  workspaceSections,
  type OpenWorkspace,
  type SidebarSection,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { importedWorkspaces } from '../fixtures/importedWorkspaces'
import type { Membership } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import type { Workspace, WorkspaceStatus } from '../fixtures/workspaces'
import { paths } from '../paths'
import { importedScreensOf } from './importedScreens'
import { isImported } from './importedWorkspace'
import type { WorkspaceState } from './workspaceState'

/**
 * The links of the selected row of the open workspace: the screen of its
 * state, and for a workspace from Conductor the question of its Archive.
 * Null keeps a control static, and undefined keeps the native one.
 */
type OpenRowLinks = Readonly<{
  to: string | null | undefined
  archiveTo?: string | null
}>

/**
 * The links of the selected row, where the mockups draw one screen for
 * each state: a workspace from Conductor, and the new workspace on a
 * chosen branch. Null keeps a control static for an imported state that
 * no entry draws. Undefined keeps the row of every other workspace.
 */
export function openRowLinks(state: WorkspaceState): OpenRowLinks {
  if (isImported(state)) {
    const screens = importedScreensOf(state)
    return { to: screens.chat, archiveTo: screens.archive }
  }
  if (state.workspace !== 'saved-carts-branch') return { to: undefined }
  if (state.sandbox === 'starting') return { to: paths.newWorkspaceBranchStart }
  if (state.sandbox === 'error') return { to: paths.newWorkspaceBranchGone }
  return { to: undefined }
}

/** The sections of the sidebar beside an open workspace that is not archived. */
function sectionsOf(
  open: OpenWorkspace,
  suspended: boolean,
  created: readonly OpenWorkspace[],
  row?: OpenRowLinks,
): SidebarSection[] {
  if (suspended) return suspendedSections(open.workspace)
  if (open.workspace.from === 'conductor') {
    return sectionsWithImport(importedWorkspaces, open, row?.to, {
      archiveTo: row?.archiveTo,
    })
  }
  return workspaceSections(open, undefined, created, row?.to ?? undefined)
}

/**
 * The sidebar beside an open workspace, which shows its current status. An
 * archived workspace sits in the open Archived group. In a suspended org
 * every row shows stopped, and nothing in the sidebar changes the org. A
 * workspace from Conductor sits in Import from Conductor, with the other
 * workspaces of its import.
 */
export function workspaceSidebar(props: {
  workspace: Workspace
  status: WorkspaceStatus
  suspended: boolean
  viewer: Membership
  /** The workspaces that the create flow made by then. */
  created: readonly OpenWorkspace[]
  /** The last day of Restore of the archived workspace has not passed. */
  restoreOpen: boolean
  /**
   * The screen of the state of the open workspace on its selected row, and
   * its Archive, where the mockups draw them.
   */
  row?: OpenRowLinks
}): ReactNode {
  const { workspace, status, suspended, viewer, created, row } = props
  if (status !== 'archived') {
    const open = { workspace, status }
    return (
      <Sidebar
        org={orgs.acme}
        sections={sectionsOf(open, suspended, created, row)}
        suspended={suspended}
        viewer={viewer}
      />
    )
  }
  // A workspace from Conductor that was archived before its activation has
  // no kept cloud computer, so its row offers no Restore.
  const list =
    workspace.from === 'conductor'
      ? archivedWithImport(workspace, importedWorkspaces, row?.to)
      : archivedSections(workspace, suspended, props.restoreOpen)
  return (
    <Sidebar
      archived={list.archived}
      org={orgs.acme}
      sections={list.sections}
      suspended={suspended}
      viewer={viewer}
    />
  )
}
