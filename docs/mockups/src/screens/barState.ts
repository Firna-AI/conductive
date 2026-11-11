import { appActions, gitHubAccesses } from '../components/workspace/barModel'

/**
 * The parts of the workspace state that choose the actions of the pull
 * request bar. `workspaceState.ts` adds them to the state of the screen.
 */
export const barStateProperties = {
  /**
   * Local work in the sandbox: changed files that are not committed, or
   * commits that no remote branch holds. Commit and push then takes the
   * place of Merge and of the fixes, and Continue asks first.
   */
  localWork: { enum: ['none', 'changes'] },
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
} as const

export const barStateKeys = [
  'localWork',
  'access',
  'appAction',
  'branch',
] as const

/** No local work, write access, and no action of the app. */
export const barStateDefaults = {
  localWork: 'none',
  access: 'write',
  appAction: 'none',
  branch: 'first',
} as const
