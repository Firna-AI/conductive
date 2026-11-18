/**
 * The catalogue paths of the pull request bar, under `app/banner`: the
 * screens of its actions and of the checks of each of its states.
 */

/** The screens of the actions of the pull request bar. */
export const barPaths = {
  merging: 'app/banner/merge',
  mergeMovedHead: 'app/banner/merge/moved-head',
  mergeNoRight: 'app/banner/merge/no-right',
  mergeRefused: 'app/banner/merge/refused',
  markingReady: 'app/banner/blocked/marking-ready',
  localWork: 'app/banner/local-work',
  noCommitsLocalWork: 'app/banner/no-commits/local-work',
  continueQuestion: 'app/banner/continue',
  continuing: 'app/banner/continue/running',
  continueFailed: 'app/banner/continue/failed',
  continueWaits: 'app/banner/continue/waits',
  continued: 'app/banner/continued',
  /** The message that each agent action sends, in the chat. */
  sent: {
    'fix-checks': 'app/banner/sent',
    'create-pull-request': 'app/banner/sent/create-pull-request',
    'commit-and-push': 'app/banner/sent/commit-and-push',
    push: 'app/banner/sent/push',
    'resolve-conflicts': 'app/banner/sent/resolve-conflicts',
    'address-review': 'app/banner/sent/address-review',
  },
} as const

/** The screen that shows the checks of each pull request state. */
export const checksPaths = {
  none: 'app/banner',
  'no-commits': 'app/banner/no-commits',
  'checks-running': 'app/banner/checks',
  'checks-failed': 'app/banner/checks/failed',
  'ready-to-merge': 'app/banner/checks/ready-to-merge',
  merged: 'app/banner/checks/merged',
  conflict: 'app/banner/blocked',
  'changes-requested': 'app/banner/blocked/changes-requested',
  draft: 'app/banner/blocked/draft',
  closed: 'app/banner/blocked/closed',
  blocked: 'app/banner/blocked/blocked',
} as const
