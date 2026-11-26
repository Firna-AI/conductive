import {
  queueRebaseInstructions,
  queueSyncInstructions,
  type QueueRebaseTarget,
} from './queueRebaseCopy'

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
  readyForReview: 'Ready for review',
  markingReady: 'Marking ready',
  continue: 'Continue',
  continuing: 'Continuing',
  archive: 'Archive',
  openOnGitHub: 'Open on GitHub',
  noPullRequest: 'No pull request yet',
  noCommits: 'No commits yet',
} as const

/**
 * The messages under the bar after a merge or a Continue, and the base
 * that moved to the default branch before a pull request opened.
 */
export type BarMessageKind =
  | 'merge-moved-head'
  | 'merge-no-right'
  | 'merge-refused'
  | 'merge-stack-held'
  | 'ready-no-right'
  | 'ready-pull-changed'
  | 'ready-refused'
  | 'continue-waits'
  | 'continue-failed'
  | 'base-moved'

/**
 * The branches that a message of the bar names. `moved` is the stored base
 * that GitHub no longer has, which the default branch replaced.
 */
export type BarBranches = { branch: string; base: string; moved?: string }

/**
 * The words of each message. A moved head, another pull request, and a
 * missing right use the app's own words. Every other refusal of GitHub
 * says only that GitHub refused the merge or Ready for review, beside Open
 * on GitHub, because no GitHub error text reaches the browser.
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
    case 'merge-stack-held':
      return "Another org's merge queue holds a pull request below this one."
    case 'ready-no-right':
      return "Not marked ready: your GitHub access doesn't allow changes to this pull request."
    case 'ready-pull-changed':
      return 'Not marked ready: the branch has another pull request now. Review it, then try again.'
    case 'ready-refused':
      return 'Not marked ready: GitHub refused the change.'
    case 'continue-waits':
      return 'Continue waits for the agent to finish.'
    case 'continue-failed':
      return `Continue stopped: the changed files clash with the latest ${branches.base}. The workspace stays on ${branches.branch}.`
    case 'base-moved':
      return branches.moved
        ? `Now targets ${branches.base}, because the branch ${branches.moved} is no longer on GitHub.`
        : `Now targets ${branches.base}.`
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
  /**
   * The workspace is in the merge queue, whose GitHub stack needs a linear
   * history. So Resolve conflicts asks for a rebase onto `base`, the branch
   * of the pull request below it, in place of a merge.
   */
  rebase?: QueueRebaseTarget
}

/** The facts that the restack prompt of the merge queue names. */
export type RestackFacts = QueueRebaseTarget & {
  baseHead: string
  oldBase: string
  /** The number of the pull request that moves. */
  number: number
  /** The new GitHub head after a rewrite. */
  sync?: { head: string }
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
 * Resolve conflicts of a workspace in the merge queue: a rebase onto the
 * branch below, so that the history stays linear, and a push that replaces
 * only the branch that the agent read.
 */
function rebaseConflicts(number: number, target: QueueRebaseTarget): string {
  return `Resolve conflicts in pull request #${number}, because the merge queue needs a linear history. ${queueRebaseInstructions(target)}`
}

/**
 * The fixed prompt of a restack: the one fix turn that the merge queue
 * sends, as a message of the queuer, when a layer must move onto the
 * newest head of the branch below it and the rebase of GitHub hit a
 * conflict (decision 321 A). It names the new head and the old base
 * commit, so that `--onto` moves only the own commits of the branch, also
 * after a squash merge below it.
 */
export function restackPrompt(facts: RestackFacts): string {
  const steps = facts.sync
    ? `GitHub rewrote its branch. Carry the local work onto the new GitHub head. ${queueSyncInstructions(facts.number, facts.sync.head, facts.oldBase)}`
    : queueRebaseInstructions(facts)
  return `Pull request #${facts.number} is in the merge queue. ${steps} Keep the branch history linear and keep the pull request open.`
}

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
      if (facts.rebase) return rebaseConflicts(facts.number, facts.rebase)
      return `Pull request #${facts.number} has conflicts with \`${facts.base}\`. Fetch \`origin/${facts.base}\` and merge it into this branch. Resolve each conflict, run the tests, then commit and push.`
    case 'address-review':
      return `${requesters(facts.reviewers)} requested changes on ${pr}. Read the open review comments with \`gh\`, make the changes, then commit and push. Don't reply on GitHub. If \`gh\` is missing or fails, stop and say that \`gh\` failed.`
  }
}
