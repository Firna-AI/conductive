import type { ActivityStatus } from '../../fixtures/workspaces'

/**
 * The states whose header state opens the menu with Restart. Starting
 * already restarts. Stopped and Couldn't start keep their Resume and Try
 * again bars, and an archived workspace has no running software.
 */
export const restartableStates: ReadonlySet<ActivityStatus> = new Set([
  'ready',
  'working',
  'input',
  'unread',
])

/**
 * The words of Restart in the header state menu. Restart restarts the agent
 * runner and the preview relay of the cloud computer, after it downloads
 * the newest software. The terminals keep running.
 */
export const restartCopy = {
  menuLabel: 'Cloud computer',
  item: 'Restart',
  note: 'Restarts the agents and the port previews, and installs updates.',
  confirmTitle: 'Stop the agent and restart?',
  confirmBody:
    'An agent is working. Restart stops its turn. The terminals keep running.',
  confirmAction: 'Restart',
  updateCheckFailed: "Couldn't check for updates.",
  updateCheckFailedBody: 'The restart uses the installed software.',
  failedToast: "Couldn't restart.",
  failed: "The software didn't restart. Try again.",
} as const
