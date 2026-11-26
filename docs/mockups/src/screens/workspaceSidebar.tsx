import type { ReactNode } from 'react'
import { defined, plainData } from '../defined'
import {
  archivedSections,
  removedSections,
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { sidebar } from '../entries/components/workspaces/Sidebar.mockup'
import type { Membership } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import type { ShortcutChanges } from '../fixtures/shortcutChanges'
import type { Workspace } from '../fixtures/workspaces'
import type { ActivityStatus } from '../../../../src/ui/components/workspaces/activityStatus'
import { changedWorkspaces } from './orgWorkspaces'
import { queueSpecOf } from './queueBarStates'
import { queueListOf, queuedKeys, sectionsWithout } from './queueLists'
import { isRemoved } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'

/**
 * The sidebar beside the open workspace of a state, which shows its
 * current status. The rows that the state changed show their states of
 * then. The toast of an Archive shows at once, so the row of the workspace
 * shows that Archive. An archived workspace sits in the open Archived
 * group, with Restore while its last day has not passed. A removed
 * workspace, which a link opened, has no row: the Archived group stays
 * closed, with its count, and no row is selected. In a suspended org every
 * row shows stopped, and nothing in the sidebar changes the org. A state
 * of the merge queue shows its queues in the Merge queue group, and their
 * workspaces leave their sections. `shortcuts` holds the person's changes,
 * for the key of the Search row.
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
    const spec = suspended ? undefined : queueSpecOf(state.queue)
    const listed = suspended
      ? suspendedSections(workspace)
      : workspaceSections(
          { workspace, status },
          undefined,
          changedWorkspaces(state),
        )
    const sections = spec ? sectionsWithout(listed, queuedKeys(spec)) : listed
    return (
      <sidebar.Component
        moklyInstance="sidebar"
        org={orgs.acme}
        sections={plainData(sections)}
        suspended={suspended}
        viewer={viewer}
        {...defined({
          queue: spec && plainData(queueListOf(spec, { workspace, status })),
          shortcuts,
        })}
      />
    )
  }
  const removed = isRemoved(state.archive)
  const list = removed
    ? removedSections(workspace, suspended)
    : archivedSections(workspace, suspended, state.archive === 'kept')
  return (
    <sidebar.Component
      archived={plainData(list.archived)}
      archivedCollapsed={removed}
      moklyInstance="sidebar"
      org={orgs.acme}
      sections={plainData(list.sections)}
      suspended={suspended}
      viewer={viewer}
      {...defined({ shortcuts })}
    />
  )
}
