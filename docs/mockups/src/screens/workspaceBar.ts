import { barModel, type BarModel } from '../components/workspace/barModel'
import { continuedBranch, viewerMergeMethod } from '../fixtures/barActions'
import type { RepositoryKey } from '../fixtures/repositories'
import { movedBranch, movedRepository } from '../fixtures/repositoryMove'
import type { Workspace } from '../fixtures/workspaces'
import { isRunning } from './composerFor'
import { isNew } from './workspaceTabs'
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

/**
 * The branch and the repository of the workspace. The branch is its first
 * one, the one after Continue, or the one after a repository change. A new
 * workspace without its title is still on its placeholder branch. The
 * repository is the new one while a change runs and after it.
 */
export function placeOf(
  state: WorkspaceState,
  workspace: Workspace,
): { branch: string; repository: RepositoryKey } {
  if (state.repositoryMove === 'changed')
    return { branch: movedBranch, repository: movedRepository }
  return {
    branch: branchOf(state, workspace),
    repository:
      state.repositoryMove === 'changing'
        ? movedRepository
        : workspace.repository,
  }
}

function branchOf(state: WorkspaceState, workspace: Workspace): string {
  if (state.branch === 'continued') return continuedBranch
  if (state.name === 'untitled' && isNew(state))
    return workspace.placeholderBranch ?? workspace.branch
  return workspace.branch
}

/** The state of the repository button in the header, if any. */
export function repositoryControlOf(
  state: WorkspaceState,
): 'open' | 'changing' | undefined {
  if (state.repositoryMove === 'changing') return 'changing'
  return state.overlay === 'repository' ? 'open' : undefined
}
