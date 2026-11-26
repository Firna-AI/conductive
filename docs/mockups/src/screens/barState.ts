import {
  appActions,
  gitHubAccesses,
  localWorkKinds,
} from '../../../../src/ui/components/workspace/barModel'
import { workspaceQueueStates } from './queueBarStates'

/**
 * The parts of the workspace state that choose the actions of the pull
 * request bar. `workspaceState.ts` adds them to the state of the screen.
 */
export const barStateProperties = {
  /**
   * Local work in the sandbox: none, only commits that no remote branch
   * holds, or changed files that are not committed. Push or Commit and push
   * then takes the place of Merge and of the fixes, and Continue asks first.
   */
  localWork: { enum: localWorkKinds },
  /**
   * The GitHub access of the viewer to the repository: write or more, read
   * only, or unknown when the Worker could not read it. Merge and Ready
   * for review need write, and the agent actions show unless the access is
   * read only.
   */
  access: { enum: gitHubAccesses },
  /**
   * The action of the app that the bar shows: a merge that runs, a merge
   * that GitHub refused for a moved head, a missing right, or another
   * reason, Ready for review while it runs, or a Continue that runs or
   * that stopped.
   */
  appAction: { enum: appActions },
  /**
   * The branch of the workspace: its first branch, or the new branch from
   * the latest base after Continue.
   */
  branch: { enum: ['first', 'continued'] },
  /**
   * The base branch of the workspace: its own, the picked branch after a
   * start that stacks on it (decision 301), or the default branch after
   * GitHub deleted that picked branch (decision 304). Then a line under
   * the bar says that the base moved.
   */
  base: { enum: ['own', 'stacked', 'moved'] },
  /**
   * The repository change of the workspace: none, a change that runs, or
   * the workspace after the change, on a new branch of acme/billing-service.
   */
  repositoryMove: { enum: ['none', 'changing', 'changed'] },
  /**
   * The merge queue of the open workspace, as `workspaceQueueStates` says:
   * the bar, the header menu, and the Merge queue group of the sidebar.
   * It is optional, so a state without it draws no part of the queue.
   */
  queue: { enum: workspaceQueueStates },
} as const

export const barStateKeys = [
  'localWork',
  'access',
  'appAction',
  'branch',
  'base',
  'repositoryMove',
] as const

/** No local work, write access, no action of the app, and its own base. */
export const barStateDefaults = {
  localWork: 'none',
  access: 'write',
  appAction: 'none',
  branch: 'first',
  base: 'own',
  repositoryMove: 'none',
} as const
