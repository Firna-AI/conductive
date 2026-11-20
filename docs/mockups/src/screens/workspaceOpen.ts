import { mayArchiveWorkspace } from '../components/workspaces/permissions'
import { bannerSummary } from '../fixtures/pullRequests'
import { suspendedOwner } from '../fixtures/startRefusals'
import { viewerOf } from './sessionStarter'
import { barOf, placeOf } from './workspaceBar'
import { openWorkspace } from './workspaceRun'
import { activityOf, archiveRestore, drawnState } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'
import { workspaceName } from './workspaceTabs'

/**
 * The open workspace of a state, as the workspace screen draws it: the
 * drawn state, the workspace with the name, the branch and the repository,
 * and the GitHub state of its pull request bar, its status, and what the
 * person signed in may do in it. In a suspended org, and in an archived
 * workspace, nothing can change.
 */
export function workspaceOpen(input: WorkspaceState) {
  const state = drawnState(input)
  const suspended = state.org === 'suspended'
  const open = openWorkspace(state)
  const record = open.record
  // An owner's refused start belongs to a suspended member, whom an active
  // admin sees. A suspended org refuses the start of every owner.
  const ownerRefused = state.sandbox === 'refused' && !suspended
  // Its row in the list shows the GitHub state of its pull request bar.
  const workspace = {
    ...record,
    owner: ownerRefused ? suspendedOwner : record.owner,
    name: workspaceName(state, record),
    ...placeOf(state, record),
    github: bannerSummary(state.banner),
  }
  const archived = state.sandbox === 'archived'
  const readOnly = archived || suspended
  const viewer = viewerOf(state)
  const membership = { person: viewer, role: state.viewer }
  // Decision 42: the workspace's owner and the org's admins archive it.
  const archivable =
    !readOnly && mayArchiveWorkspace(membership, workspace.owner)
  return {
    state,
    open,
    workspace,
    status: activityOf(state),
    suspended,
    archived,
    readOnly,
    viewer,
    membership,
    archivable,
    // Every member restores it while the app keeps its cloud computer.
    restorable: archiveRestore(state) === 'available',
    bar: barOf(state, { archivable, readOnly }),
  }
}
