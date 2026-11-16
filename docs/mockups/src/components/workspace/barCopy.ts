/**
 * The words of the actions of the pull request bar: the labels, the
 * messages under the bar, and the text that the agent actions send as a
 * message of the member who clicks. This module imports no fixture, so the
 * app can take the words from here too.
 */

/**
 * The agent actions, in their order: the order of their labels, and of the
 * Prompts tab of the org settings.
 */
export const agentActions = [
  'create-pull-request',
  'commit-and-push',
  'push',
  'fix-checks',
  'resolve-conflicts',
  'address-review',
] as const

/** The steps that the agent does on a press of the bar. */
export type AgentAction = (typeof agentActions)[number]

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

/**
 * Steps that start with a short line that names the task, then a blank
 * line and the rest. A session that a press starts takes its first line as
 * its title.
 */
function titled(title: string, rest: string): string {
  return `${title}\n\n${rest}`
}

/**
 * The default steps of each agent action, which a press sends while no
 * admin of the org replaced them in the Prompts tab. The facts come after
 * the steps, so the steps say "below" where they need a fact. Steps that
 * need the GitHub CLI say what to do when `gh` is missing or fails, as in a
 * workspace from an older org image. That fallback is part of the steps,
 * because each fallback fits the steps of its action.
 */
export const defaultSteps: Readonly<Record<AgentAction, string>> = {
  'create-pull-request': titled(
    'Open a pull request for this branch.',
    'Commit the changes that are not committed, and push this branch. Use `gh pr create`, with the target branch below as the base. Write a short title, and describe what changed and why. If `gh` is missing or fails, push the branch and say that `gh` failed.',
  ),
  'commit-and-push':
    'Commit the changes that are not committed, with a clear message, and push this branch.',
  push: 'Push this branch.',
  'fix-checks': titled(
    'Fix the failed checks of this pull request.',
    'Find out why the checks below failed. Use `gh pr checks`, and read the logs of failed GitHub Actions jobs with `gh run view --log-failed`. For a check from another service, read its details, or run it locally. Fix the cause, then commit and push. If `gh` is missing or fails, run the failed checks locally, and say that `gh` failed.',
  ),
  'resolve-conflicts': titled(
    'Resolve the conflicts of this pull request.',
    'Fetch the target branch below from `origin` and merge it into this branch. Resolve each conflict, run the tests, then commit and push.',
  ),
  'address-review': titled(
    'Address the requested changes on this pull request.',
    'Read the open review comments with `gh`, make the changes, then commit and push. If `gh` is missing or fails, stop and say that `gh` failed.',
  ),
}

/**
 * The last line of each press. A reply on GitHub posts as the member who
 * clicked, and that member did not ask for one.
 */
export const fixedLine = "Don't reply on GitHub."

/**
 * One labeled line for each fact that an action names. Commit and push and
 * Push name no fact.
 */
export function factLines(action: AgentAction, facts: PromptFacts): string[] {
  const pullRequest = `Pull request: #${facts.number}`
  const target = `Target branch: ${facts.base}`
  switch (action) {
    case 'create-pull-request':
      return [target]
    case 'commit-and-push':
    case 'push':
      return []
    case 'fix-checks':
      return [pullRequest, `Failed checks: ${listText(facts.failedChecks)}`]
    case 'resolve-conflicts':
      return [pullRequest, target]
    case 'address-review':
      return [pullRequest, `Requested changes: ${requesters(facts.reviewers)}`]
  }
}

/**
 * The part that the app adds after the steps of each press: the line
 * `---`, one line for each fact, and the fixed line. The Prompts tab of the
 * org settings shows it under the steps of each action, with sample facts.
 */
export function fixedPart(action: AgentAction, facts: PromptFacts): string {
  return ['---', ...factLines(action, facts), fixedLine].join('\n')
}

/** The steps that the admins of an org saved, for each action they edited. */
export type OrgSteps = Readonly<Partial<Record<AgentAction, string>>>

/**
 * The text that a press of an agent action sends: the steps, one blank
 * line, and the fixed part. `steps` are the steps that an admin saved for
 * the org, else the default steps of the action. Blank lines at the end of
 * the steps go, so one blank line always comes before the line `---`.
 */
export function agentPrompt(
  action: AgentAction,
  facts: PromptFacts,
  steps: string = defaultSteps[action],
): string {
  return `${steps.trimEnd()}\n\n${fixedPart(action, facts)}`
}
