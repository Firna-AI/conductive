/**
 * The words of the branch control of New workspace: the control, its
 * dropdown with the parts Start from and Target, and the refusals of the
 * branch check, from decisions 301, 303, 305, and 309. This module imports
 * no fixture, so the app can take the words from here too.
 */

/** The words of the branch control and of the Start from part. */
export const branchCopy = {
  /** The name of the dropdown, and the title of its sheet on a phone. */
  picker: 'Branch',
  /**
   * The spoken name of the control: the branch that it shows, and the
   * target while the control names it (decision 309).
   */
  control: (branch: string, target?: string) =>
    target === undefined
      ? `Branch: ${branch}`
      : `Branch: ${branch}, target ${target}`,
  /**
   * The muted part of the control after the name, while a picked branch
   * targets the default branch, such as `→ main`.
   */
  toTarget: (branch: string) => `→ ${branch}`,
  /** The label of the first part of the dropdown: the search and the list. */
  startFrom: 'Start from',
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
 * The words of the Target part of the dropdown, which shows when the picked
 * branch is not the default branch. Its two rows name the picked branch and
 * the default branch, and the line under them says what the pull request
 * then holds.
 */
export const targetCopy = {
  /** The label of the Target part, and its spoken name. */
  label: 'Target',
  /** The line of the picked branch, which stacks the work on it. */
  picked: 'The pull request holds only the new work.',
  /** The line of the default branch, which also gets the picked branch. */
  defaultBranch: (picked: string) =>
    `The pull request also holds the commits of the branch ${picked}.`,
} as const

/**
 * The words of the refusals of the branch check on a create. The composer
 * keeps the message (decision 303), and each body says so.
 */
export const branchRefusalCopy = {
  missing: (branch: string) =>
    `The branch ${branch} is no longer on GitHub. Your message is kept.`,
  /** The recovery of a missing branch: the form starts from this branch. */
  startFrom: (branch: string) => `Start from ${branch}`,
  noAccess: (repository: string) =>
    `Your GitHub account can't read ${repository}. Your message is kept.`,
} as const
