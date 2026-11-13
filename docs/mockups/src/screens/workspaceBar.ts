import { barModel, type BarModel } from '../components/workspace/barModel'
import { continuedBranch, viewerMergeMethod } from '../fixtures/barActions'
import { pickedBranch } from '../fixtures/branches'
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
    baseMoved: state.base === 'moved',
  })
}

/** The branch of the workspace: its first one, or the one after Continue. */
export function branchOf(state: WorkspaceState, workspace: Workspace): string {
  return state.branch === 'continued' ? continuedBranch : workspace.branch
}

/**
 * The base branch of the workspace: its own, the picked branch that a
 * start stacked it on, or the default branch after GitHub deleted that
 * branch, which `movedBase` then names.
 */
export function baseOf(
  state: WorkspaceState,
  workspace: Workspace,
): Pick<Workspace, 'baseBranch' | 'movedBase'> {
  switch (state.base) {
    case 'own':
      return { baseBranch: workspace.baseBranch }
    case 'stacked':
      return { baseBranch: pickedBranch }
    case 'moved':
      return { baseBranch: undefined, movedBase: pickedBranch }
  }
}
