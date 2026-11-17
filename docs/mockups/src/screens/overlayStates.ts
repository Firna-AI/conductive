/**
 * What lies open over the workspace: the session history, the question
 * before a running session closes, the owner of the workspace, the tab
 * menu of the first session or of the shown file or diff tab, such as the
 * temporary tab, or the question of Continue with work that is not pushed.
 * Or the question before a terminal closes, or the toast of a terminal
 * that did not open or close. Or the menu of the repository, the question
 * before a repository change, or the toast of a change that stopped. Or
 * the menu of the header state, the question of Restart while an agent
 * works, the time after Restart until the agents are back, or that time
 * with the toast of a failed update check.
 */
export const overlayStates = [
  'none',
  'history',
  'close-session',
  'reassign',
  'tab-menu',
  'continue-unpushed',
  'close-terminal',
  'terminal-open-failed',
  'terminal-close-failed',
  'repository',
  'repository-change',
  'repository-failed',
  'restart',
  'restart-confirm',
  'restarting',
  'restart-update-failed',
] as const
