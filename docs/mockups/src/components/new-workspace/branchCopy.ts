/**
 * The words of the branch control of New workspace: its picker, the target
 * choice of a picked branch, and the refusals of the branch check, from
 * decisions 291, 293, and 295. This module imports no fixture, so the app
 * can take the words from here too.
 */

/** The words of the branch control and of its picker. */
export const branchCopy = {
  /** The name of the picker, and the title of its sheet on a phone. */
  picker: 'Branch',
  /** The spoken name of the control, with the branch that it shows. */
  control: (branch: string) => `Branch: ${branch}`,
  /** The label and the placeholder of the search field. */
  search: 'Search branches',
  /** The muted detail of the default branch, the first row of the list. */
  defaultDetail: 'default',
  loading: 'Loading branches…',
  noMatch: (query: string) => `Nothing matches “${query}”`,
  /** A read of GitHub that failed. Try again reads the list again. */
  failed: {
    title: "The branches didn't load",
    body: "GitHub didn't answer.",
  },
  /** The GitHub account of the member cannot read the repository. */
  noAccess: {
    title: (repository: string) =>
      `Your GitHub account can't read ${repository}`,
    body: 'Its branches show here once you have access on GitHub.',
  },
} as const

/**
 * The words of the choice of two targets, which shows when the picked
 * branch is not the default branch. Each option names its branch, and the
 * line under the choice says what the pull request then holds.
 */
export const targetCopy = {
  /** The spoken name of the choice. */
  label: 'Target',
  option: (branch: string) => `Target ${branch}`,
  /** The line of the picked branch, which stacks the work on it. */
  picked: 'The pull request holds only the new work.',
  /** The line of the default branch, which also gets the picked branch. */
  defaultBranch: (picked: string) =>
    `The pull request also holds the commits of ${picked}.`,
} as const

/**
 * The words of the refusals of the branch check on a create. The composer
 * keeps the message (decision 293), and each body says so.
 */
export const branchRefusalCopy = {
  missing: (branch: string) =>
    `The branch ${branch} is no longer on GitHub. Your message is kept.`,
  /** The recovery of a missing branch: the form starts from this branch. */
  startFrom: (branch: string) => `Start from ${branch}`,
  noAccess: (repository: string) =>
    `Your GitHub account can't read ${repository}. Your message is kept.`,
} as const
