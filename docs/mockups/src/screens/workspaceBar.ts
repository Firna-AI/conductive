import {
  barModel,
  type BarModel,
} from '../../../../src/ui/components/workspace/barModel'
import { defined } from '../defined'
import { continuedBranch, viewerMergeMethod } from '../fixtures/barActions'
import { pickedBranch } from '../fixtures/branches'
import { repositories, type RepositoryKey } from '../fixtures/repositories'
import { movedBranch, movedRepository } from '../fixtures/repositoryMove'
import type { Workspace } from '../fixtures/workspaces'
import { isRunning } from './composerFor'
import { mergeStackOf, openQueueFacts, queueBaseOf } from './queueBarStates'
import { serviceControls } from './serviceState'
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
    ...defined({
      queue: openQueueFacts(state.queue),
      stack: mergeStackOf(state.queue),
    }),
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
 * state, and the repository, or the change of the repository that runs. A
 * viewer whose service rows offer no Stop and no Restart cannot restart
 * the software either, so the header state is plain text.
 */
export function headerMenusOf(state: WorkspaceState): {
  ownerOpen: boolean
  stateOpen: boolean
  repositoryControl?: 'open' | 'changing'
  canRestart?: false
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
    ...(serviceControls(state) ? {} : { canRestart: false }),
  }
}

type WorkspaceBase = Pick<Workspace, 'baseBranch' | 'movedBase'>

/**
 * The base branch of the workspace: its own, the picked branch that a
 * start stacked it on, or the default branch after GitHub deleted that
 * branch, which `movedBase` then names. A queued workspace stores the
 * branch of the layer below it. It holds no undefined field, because the
 * registered parts of Mokly take the workspace as data.
 */
function baseOf(state: WorkspaceState, workspace: Workspace): WorkspaceBase {
  const queued = queueBaseOf(state.queue)
  if (queued) return { baseBranch: queued }
  switch (state.base) {
    case 'own':
      return defined({ baseBranch: workspace.baseBranch })
    case 'stacked':
      return { baseBranch: pickedBranch }
    case 'moved':
      return {
        baseBranch: repositories[workspace.repository].defaultBranch,
        movedBase: pickedBranch,
      }
  }
}
