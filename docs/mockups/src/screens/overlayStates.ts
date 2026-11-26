/**
 * What lies open over the workspace: the session history, the question
 * before a running session closes, the owner of the workspace, the tab
 * menu of the first session or of the shown file or diff tab, such as the
 * temporary tab, or the question of Continue with work that is not pushed.
 * Or the question before a terminal closes, or the toast of a terminal
 * that did not open or close. Or the sheet of the values of a request,
 * which Give a value opens on a phone. Or the menu of the repository, the
 * question before a repository change, or the toast of a change that
 * stopped. Or the menu of the header state, the question of Restart while
 * an agent works, the time after Restart until the agents are back, or
 * that time with the toast of a failed update check. Or the workspace menu
 * that the name in the header opens, or the field of its Rename in place
 * of the name. Or the page of the shown Preview tab or HTML file in its
 * large window over the whole app, after Expand on desktop. Or the
 * question before Remove from queue.
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
  'value-sheet',
  'repository',
  'repository-change',
  'repository-failed',
  'restart',
  'restart-confirm',
  'restarting',
  'restart-update-failed',
  'workspace-menu',
  'header-rename',
  'expanded-page',
  'remove-from-queue',
] as const
