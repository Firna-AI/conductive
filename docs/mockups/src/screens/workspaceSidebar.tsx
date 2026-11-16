import type { ReactNode } from 'react'
import { defined, plainData } from '../defined'
import {
  archivedSections,
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { sidebar } from '../entries/components/workspaces/Sidebar.mockup'
import type { Membership } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import type { ShortcutChanges } from '../fixtures/shortcutChanges'
import type { ActivityStatus, Workspace } from '../fixtures/workspaces'
import { changedWorkspaces } from './orgWorkspaces'
import type { WorkspaceState } from './workspaceState'

/**
 * The sidebar beside the open workspace of a state, which shows its
 * current status. The rows that the state changed show their states of
 * then. The toast of an Archive shows at once, so the row of the workspace
 * shows that Archive. An archived workspace sits in the open Archived
 * group, with Restore while its last day has not passed. In a suspended
 * org every row shows stopped, and nothing in the sidebar changes the org.
 * `shortcuts` holds the person's changes, for the key of the Search row.
 */
export function workspaceSidebar(props: {
  state: WorkspaceState
  workspace: Workspace
  status: ActivityStatus
  viewer: Membership
  shortcuts?: ShortcutChanges
}): ReactNode {
  const { state, status, viewer, shortcuts } = props
  const suspended = state.org === 'suspended'
  const workspace =
    state.toast === 'archived'
      ? { ...props.workspace, updated: 'now' }
      : props.workspace
  if (status !== 'archived') {
    const sections = suspended
      ? suspendedSections(workspace)
      : workspaceSections(
          { workspace, status },
          undefined,
          changedWorkspaces(state),
        )
    return (
      <sidebar.Component
        moklyInstance="sidebar"
        org={orgs.acme}
        sections={plainData(sections)}
        suspended={suspended}
        viewer={viewer}
        {...defined({ shortcuts })}
      />
    )
  }
  const list = archivedSections(workspace, suspended, state.archive === 'kept')
  return (
    <sidebar.Component
      archived={plainData(list.archived)}
      moklyInstance="sidebar"
      org={orgs.acme}
      sections={plainData(list.sections)}
      suspended={suspended}
      viewer={viewer}
      {...defined({ shortcuts })}
    />
  )
}
