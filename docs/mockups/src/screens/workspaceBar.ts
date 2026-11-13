import { barModel, type BarModel } from '../components/workspace/barModel'
import { continuedBranch, viewerMergeMethod } from '../fixtures/barActions'
import type { Workspace } from '../fixtures/workspaces'
import { isRunning } from './composerFor'
import type { WorkspaceState } from './workspaceState'

/**
 * The actions of the pull request bar in a state of the workspace screen.
 * `readOnly` is an archived workspace or a suspended org, and `archivable`
 * says that the viewer may archive the workspace.
 */
export function barOf(
  state: WorkspaceState,
  viewer: { archivable: boolean; readOnly: boolean },
): BarModel {
  return barModel({
    banner: state.banner,
    localWork: state.localWork,
    access: state.access,
    method: viewerMergeMethod,
    appAction: state.appAction,
    turnRuns: isRunning(state),
    readOnly: viewer.readOnly,
    archivable: viewer.archivable,
    // The mockups show the archived workspace after its Archive, with no
    // busy state between.
    archiving: false,
  })
}

/** The branch of the workspace: its first one, or the one after Continue. */
export function branchOf(state: WorkspaceState, workspace: Workspace): string {
  return state.branch === 'continued' ? continuedBranch : workspace.branch
}
