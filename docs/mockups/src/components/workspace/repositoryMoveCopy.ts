/**
 * The words of the repository change of a workspace: the menu of the
 * repository in the header, the question before the change, the progress,
 * the failure, and the note in each session. The app and the mockups share
 * them.
 */

export const repositoryMenu = {
  label: 'Repository',
  /** The spoken name of the button in the header. */
  button: (repository: string) => `Repository: ${repository}`,
  /**
   * The detail of a chosen repository that this cloud computer does not
   * hold. A press opens New workspace with that repository.
   */
  missing: 'New workspace',
  note: 'The workspace moves to a new branch of the repository that you pick.',
  /** The second note, only when a chosen repository is missing. */
  missingNote:
    'A repository marked New workspace is not in this cloud computer.',
} as const

export const repositoryQuestion = {
  title: 'Change repository?',
  intro: (repository: string) =>
    `The workspace moves to a new branch of ${repository}. Nothing is deleted.`,
  left: (repository: string) =>
    `This work stays with ${repository}, and the workspace stops following it:`,
  carried: (repository: string) =>
    `This work in ${repository} moves to the new branch:`,
  pullRequest: (number: number) => `Pull request #${number}`,
  open: 'open',
  pushed: (count: number) =>
    count === 1 ? '1 commit of the branch' : `${count} commits of the branch`,
  onGitHub: 'on GitHub',
  cancel: 'Cancel',
  confirm: 'Change repository',
} as const

/** The spoken state of the header button while the change runs. */
export const repositoryProgress = 'Changing repository'

/** The toast after a change that stopped. The old repository stays. */
export const repositoryFailure = {
  title: "The repository didn't change.",
  clash: (repository: string) =>
    `Changed files in ${repository} clash with its latest default branch. Commit or discard them, then try again.`,
} as const

/**
 * The note of the change in each session, as the words before the new
 * repository, between it and the new branch, and after it. `who` is "You"
 * for the member who changed it.
 */
export function repositoryChangedNote(who: string): {
  before: string
  between: string
} {
  return {
    before: `${who} moved the workspace to `,
    between: ', on the new branch ',
  }
}
