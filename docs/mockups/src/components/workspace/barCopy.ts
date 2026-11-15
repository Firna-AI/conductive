/**
 * The words of the actions of the pull request bar: the labels, the
 * messages under the bar, and the fixed prompts that the agent actions send
 * as a message of the member who clicks. This module imports no fixture, so
 * the app can take the words from here too.
 */

/** The steps that the agent does on a fixed prompt. */
export type AgentAction =
  | 'create-pull-request'
  | 'commit-and-push'
  | 'push'
  | 'fix-checks'
  | 'resolve-conflicts'
  | 'address-review'

/** The agent actions that have a command of their own in the keymap. */
export type CommandAgentAction = Exclude<AgentAction, 'push'>

/**
 * The command whose key runs an agent action. Push and Commit and push
 * share one command, so one key presses whichever of the two the bar shows.
 */
export function agentActionCommand(action: AgentAction): CommandAgentAction {
  return action === 'push' ? 'commit-and-push' : action
}

/** The merge methods of GitHub. */
export type MergeMethod = 'merge' | 'squash' | 'rebase'

export const agentActionLabels: Readonly<Record<AgentAction, string>> = {
  'create-pull-request': 'Create PR',
  'commit-and-push': 'Commit and push',
  push: 'Push',
  'fix-checks': 'Fix checks',
  'resolve-conflicts': 'Resolve conflicts',
  'address-review': 'Address review',
}

/** The Merge button names the method that the merge uses. */
export const mergeLabels: Readonly<Record<MergeMethod, string>> = {
  merge: 'Merge',
  squash: 'Squash and merge',
  rebase: 'Rebase and merge',
}

export const barLabels = {
  merging: 'Merging',
  continue: 'Continue',
  continuing: 'Continuing',
  archive: 'Archive',
  openOnGitHub: 'Open on GitHub',
  noPullRequest: 'No pull request yet',
  noCommits: 'No commits yet',
} as const

/** The messages under the bar after a merge or a Continue. */
export type BarMessageKind =
  | 'merge-moved-head'
  | 'merge-no-right'
  | 'merge-refused'
  | 'continue-waits'
  | 'continue-failed'

/** The branches that a message of the bar names. */
export type BarBranches = { branch: string; base: string }

/**
 * The words of each message. A moved head and a missing right use the
 * app's own words. Every other refusal of GitHub says only that GitHub
 * refused the merge, beside Open on GitHub, because no GitHub error text
 * reaches the browser.
 */
export function barMessageText(
  kind: BarMessageKind,
  branches: BarBranches,
): string {
  switch (kind) {
    case 'merge-moved-head':
      return 'Not merged: the branch has new commits. Review them, then merge again.'
    case 'merge-no-right':
      return `Not merged: your GitHub access doesn't allow merges into ${branches.base}.`
    case 'merge-refused':
      return 'GitHub refused the merge.'
    case 'continue-waits':
      return 'Continue waits for the agent to finish.'
    case 'continue-failed':
      return `Continue stopped: the changed files clash with the latest ${branches.base}. The workspace stays on ${branches.branch}.`
  }
}

/**
 * The words of the question before Continue, when the sandbox has local
 * work. The check counts the commits that no remote branch holds on every
 * local branch, also on the branch of an earlier Continue, and those
 * commits stay where they are.
 */
export const continueQuestion = {
  title: 'Continue with work that is not pushed?',
  intro: (base: string) =>
    `Continue starts a new branch from the latest ${base}. This work is not on GitHub:`,
  notCommitted: 'not committed',
  commits: (count: number) => (count === 1 ? '1 commit' : `${count} commits`),
  notPushed: 'not pushed',
  outcome: (commits: number) =>
    commits === 1
      ? 'The changed files move to the new branch. The commit stays on its local branch.'
      : 'The changed files move to the new branch. The commits stay on their local branches.',
  cancel: 'Cancel',
  confirm: 'Continue anyway',
} as const

/**
 * The note of Continue in each session, as the words before and after the
 * new branch: who pressed Continue, and the base of the new branch. `who`
 * is "You" for the member who pressed it.
 */
export function continuedNote(
  who: string,
  base: string,
): { before: string; after: string } {
  return {
    before: `${who} continued on `,
    after: `, a new branch from ${base}`,
  }
}

/** The facts of the pull request that the prompts name. */
export type PromptFacts = {
  number: number
  base: string
  /** The names of the failed checks, in GitHub's order. */
  failedChecks: readonly string[]
  /** The GitHub logins of the reviewers who requested changes. */
  reviewers: readonly string[]
}

/** A list in running text: "a", "a and b", or "a, b, and c". */
function listText(items: readonly string[]): string {
  if (items.length < 3) return items.join(' and ')
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

/**
 * Who requested changes: the reviewers by login, or "A reviewer" when GitHub
 * names no login, as for the review of a deleted account.
 */
function requesters(reviewers: readonly string[]): string {
  if (reviewers.length === 0) return 'A reviewer'
  return listText(reviewers.map((login) => `@${login}`))
}

const commitAndPush =
  'Commit the changes that are not committed, with a clear message, and push this branch.'

/**
 * The fixed prompt of each agent action. A prompt that needs the GitHub CLI
 * says what to do when `gh` is missing or fails, as in a workspace from an
 * older org image. No prompt asks for a reply on GitHub, because a reply
 * posts as the member who clicked.
 */
export function agentPrompt(action: AgentAction, facts: PromptFacts): string {
  const pr = `pull request #${facts.number}`
  switch (action) {
    case 'create-pull-request':
      return `Commit the changes that are not committed, push this branch, and open a pull request into \`${facts.base}\` with \`gh pr create\`. Write a short title, and describe what changed and why. If \`gh\` is missing or fails, push the branch and say that \`gh\` failed.`
    case 'commit-and-push':
      return commitAndPush
    case 'push':
      return 'Push this branch.'
    case 'fix-checks':
      return `These checks failed on ${pr}: ${listText(facts.failedChecks)}. Find out why with \`gh pr checks ${facts.number}\`, and read the logs of failed GitHub Actions jobs with \`gh run view --log-failed\`. For a check from another service, read its details, or run it locally. Fix the cause, then commit and push. If \`gh\` is missing or fails, run the failed checks locally, and say that \`gh\` failed.`
    case 'resolve-conflicts':
      return `Pull request #${facts.number} has conflicts with \`${facts.base}\`. Fetch \`origin/${facts.base}\` and merge it into this branch. Resolve each conflict, run the tests, then commit and push.`
    case 'address-review':
      return `${requesters(facts.reviewers)} requested changes on ${pr}. Read the open review comments with \`gh\`, make the changes, then commit and push. Don't reply on GitHub. If \`gh\` is missing or fails, stop and say that \`gh\` failed.`
  }
}
