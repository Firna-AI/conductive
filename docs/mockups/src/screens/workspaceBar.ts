import { barModel, type BarModel } from '../components/workspace/barModel'
import { continuedBranch, viewerMergeMethod } from '../fixtures/barActions'
import { pickedBranch } from '../fixtures/branches'
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
    baseMoved: state.base === 'moved',
  })
}

/**
 * The branch, the repository, and the base branch of the workspace. The
 * branch is its first one, the one after Continue, or the one after a
 * repository change. A new workspace without its title is still on its
 * placeholder branch. The repository is the new one while a change runs and
 * after it. `baseOf` gives the base branch.
 */
export function placeOf(
  state: WorkspaceState,
  workspace: Workspace,
): { branch: string; repository: RepositoryKey } & WorkspaceBase {
  const base = baseOf(state, workspace)
  if (state.repositoryMove === 'changed')
    return { branch: movedBranch, repository: movedRepository, ...base }
  return {
    branch: branchOf(state, workspace),
    repository:
      state.repositoryMove === 'changing'
        ? movedRepository
        : workspace.repository,
    ...base,
  }
}

function branchOf(state: WorkspaceState, workspace: Workspace): string {
  if (state.branch === 'continued') return continuedBranch
  if (state.name === 'untitled' && isNew(state))
    return workspace.placeholderBranch ?? workspace.branch
  return workspace.branch
}

/**
 * The menus of the header that the state opens: the owner, the header
 * state, and the repository, or the change of the repository that runs.
 */
export function headerMenusOf(state: WorkspaceState): {
  ownerOpen: boolean
  stateOpen: boolean
  repositoryControl?: 'open' | 'changing'
} {
  return {
    ownerOpen: state.overlay === 'reassign',
    stateOpen: state.overlay === 'restart',
    repositoryControl:
      state.repositoryMove === 'changing'
        ? 'changing'
        : state.overlay === 'repository'
          ? 'open'
          : undefined,
  }
}

type WorkspaceBase = Pick<Workspace, 'baseBranch' | 'movedBase'>

/**
 * The base branch of the workspace: its own, the picked branch that a
 * start stacked it on, or the default branch after GitHub deleted that
 * branch, which `movedBase` then names.
 */
function baseOf(state: WorkspaceState, workspace: Workspace): WorkspaceBase {
  switch (state.base) {
    case 'own':
      return { baseBranch: workspace.baseBranch }
    case 'stacked':
      return { baseBranch: pickedBranch }
    case 'moved':
      return { baseBranch: undefined, movedBase: pickedBranch }
  }
}
