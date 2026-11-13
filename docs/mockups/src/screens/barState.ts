import {
  appActions,
  gitHubAccesses,
  localWorkKinds,
} from '../components/workspace/barModel'

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
   * only, or unknown when the Worker could not read it. Merge needs write,
   * and the agent actions show unless the access is read only.
   */
  access: { enum: gitHubAccesses },
  /**
   * The action of the app that the bar shows: a merge that runs, a merge
   * that GitHub refused for a moved head, a missing right, or another
   * reason, or a Continue that runs or that stopped.
   */
  appAction: { enum: appActions },
  /**
   * The branch of the workspace: its first branch, or the new branch from
   * the latest base after Continue.
   */
  branch: { enum: ['first', 'continued'] },
  /**
   * The repository change of the workspace: none, a change that runs, or
   * the workspace after the change, on a new branch of acme/billing-service.
   */
  repositoryMove: { enum: ['none', 'changing', 'changed'] },
} as const

export const barStateKeys = [
  'localWork',
  'access',
  'appAction',
  'branch',
  'repositoryMove',
] as const

/** No local work, write access, and no action of the app. */
export const barStateDefaults = {
  localWork: 'none',
  access: 'write',
  appAction: 'none',
  branch: 'first',
  repositoryMove: 'none',
} as const
