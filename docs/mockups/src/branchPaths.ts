/**
 * The screens of a start from a branch that is not the default branch, on
 * the New workspace page and in the dialog. Each holds the branch control
 * on main, on the picked branch, or on the picked branch while the work
 * targets main, closed or with its dropdown open. The dialog draws no open
 * dropdown on target main, so its page has at most five screens.
 */
export const branchPaths = {
  page: {
    main: 'app/new-workspace/start-branch',
    mainOpen: 'app/new-workspace/start-branch/picker',
    picked: 'app/new-workspace/start-branch/target-choice/picked',
    pickedOpen: 'app/new-workspace/start-branch/target-choice',
    targetMain: 'app/new-workspace/start-branch/target-choice/target-main',
    targetMainOpen: 'app/new-workspace/start-branch/target-choice/default',
  },
  dialog: {
    main: 'app/new-workspace/start-branch/dialog',
    mainOpen: 'app/new-workspace/start-branch/dialog/open',
    picked: 'app/new-workspace/start-branch/dialog/picked',
    pickedOpen: 'app/new-workspace/start-branch/dialog/target',
    targetMain: 'app/new-workspace/start-branch/dialog/target-main',
  },
  stacked: 'app/new-workspace/start-branch/stacked',
} as const
