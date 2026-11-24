import type { GitHubSummary } from '../../../shared/generated/GitHubSummary'
import type { MergeQueueBranchLabel } from '../../../shared/generated/MergeQueueBranchLabel'
import { mergeLabels, type MergeMethod } from './barCopy'
import type { MergeProblem, QueueLine, TurnWait } from './queueModel'

/**
 * The words of the merge queue: the group of the list, the reason of a row
 * that cannot join, the controls, the line under the pull request bar, and
 * the question before Remove from queue. The rows of the group are normal
 * workspace rows, with no words of the queue. This module imports no
 * fixture, so the app can take the words from here too.
 */

export const queueLabels = {
  group: 'Merge queue',
  add: 'Add to merge queue',
  remove: 'Remove from queue',
  drop: 'Drop here to add to the merge queue',
} as const

export const defaultQueueBranchLabel: MergeQueueBranchLabel = {
  text: 'the default branch',
}

/**
 * The label of Merge on a queued workspace. It counts the layers ahead of
 * it in the queue, which land with it (decision 316). "Ahead" reads with
 * the list, where place 1 shows first. The bottom layer lands alone, so its
 * label names the merge method, as Merge outside the queue does.
 */
export function mergeButtonLabel(
  method: MergeMethod,
  below?: number,
  stackCount?: number,
): string {
  if (stackCount !== undefined) return `Merge stack (${stackCount})`
  if (below === undefined || below === 0) return mergeLabels[method]
  return `Merge with ${below} ahead`
}

/** The pull request below a layer, or the default branch below the bottom. */
function belowName(below: number | null, trunk: string): string {
  return below === null ? trunk : `#${below}`
}

/** Why the queue could not merge a layer that is ready. */
const problemText: Readonly<Record<MergeProblem, string>> = {
  'token-failed':
    'The GitHub access of the member who added it stopped working.',
  'merge-refused': 'GitHub refused the merge.',
}

/** What holds the message that the queue sends as the queuer. */
const turnWaitText: Readonly<Record<TurnWait, string>> = {
  'active-turn': 'The queue waits for a running turn to end.',
  'agent-login':
    'The queue waits for an agent login for the member who added it.',
  'open-session': 'The queue waits for an open session.',
}

/**
 * What the queue waits for on a layer whose own pull request cannot merge
 * until a member acts, in the words of its GitHub state: its checks, a
 * rebase onto the branch below it, its review, or the rules of GitHub.
 * A conflict waits for a member after the one turn of the queue did not
 * resolve it (decision 321 A). Nothing for a state that needs no member,
 * such as running checks.
 */
function ownWait(
  github: GitHubSummary | null,
  below: string,
): string | undefined {
  switch (github) {
    case 'checks-failed':
      return 'The queue waits for its checks.'
    case 'conflict':
      return `The queue waits for a rebase onto ${below}.`
    case 'changes-requested':
      return 'The queue waits for its review.'
    case 'blocked':
      return 'The queue waits until GitHub allows the merge.'
    default:
      return undefined
  }
}

/**
 * What the line of a layer that waits or is ready says after its place:
 * why the queue could not merge it, what holds the message that the queue
 * sends as the queuer, the lowest layer below it that the queue waits for,
 * its local work, which the bar asks to push first, what the queue waits
 * for on its own pull request, or the pull request that it builds on.
 */
function waitText(
  line: QueueLine,
  github: GitHubSummary | null,
  below: string,
): string {
  if (line.problem !== undefined) return problemText[line.problem]
  if (line.turnWait !== undefined) return turnWaitText[line.turnWait]
  if (line.queueWait === 'local-work')
    return 'The queue waits to check its local work.'
  if (line.queueWait === 'trunk-change')
    return 'The queue waits to verify the default branch change.'
  if (line.waitsFor !== undefined) {
    return `The queue waits for #${line.waitsFor}.`
  }
  if (line.localWork) return 'The queue waits for its local work to be pushed.'
  return (
    ownWait(line.waitsForRebase ? 'conflict' : github, below) ??
    `It builds on ${below}.`
  )
}

/**
 * The line under the bar of a queued workspace: its place, then what its
 * step does, what the queue waits for, or the pull request below it. The
 * move onto the layer below keeps its words while the one turn of the
 * queue resolves a conflict of the move (decision 321 A). An entry that
 * cannot merge keeps its place, and the bar keeps its fix, as outside the
 * queue. `github` is the GitHub state of its pull request.
 */
export function queueLineText(
  line: QueueLine,
  context: { trunk: MergeQueueBranchLabel; github: GitHubSummary | null },
): string {
  const trunk = context.trunk.text
  const place = `Place ${line.place} of ${line.size} in the merge queue.`
  const below = belowName(line.below, trunk)
  switch (line.step) {
    case 'waiting':
    case 'ready':
      return `${place} ${waitText(line, context.github, below)}`
    case 'rebasing':
      return `${place} Rebasing onto ${below}.`
    case 'merging':
      return `${place} Merging into ${trunk}.`
  }
}

/** The place of a queued workspace in the compact row of a phone. */
export function queueRowText(line: QueueLine): string {
  return `Queue ${line.place} of ${line.size}`
}

export function resetBaseFailedText(branch: string): string {
  return `The queue couldn't reset the base. This pull request still targets ${branch}.`
}

/**
 * A pull request that leaves the queue with the one that a member removes,
 * by the name of its workspace. A list that lacks its number names the
 * workspace alone.
 */
export type LeavingLayer = { name: string; number?: number }

/** A list in running text: "a", "a and b", or "a, b, and c". */
function listText(items: readonly string[]): string {
  if (items.length < 3) return items.join(' and ')
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

/**
 * The words of the question before Remove from queue. A lower entry of a
 * member stack takes the entries above it in its unit along, because a
 * member stack moves as one unit (decision 315), and the question names
 * them. A screen that lacks the number of the pull request names it
 * without its number.
 */
export const removeQuestion = {
  title: 'Remove from the merge queue?',
  body: (
    number: number | undefined,
    base: MergeQueueBranchLabel,
    above: readonly LeavingLayer[],
  ) => {
    const selected =
      number === undefined ? 'The pull request' : `Pull request #${number}`
    const target = `${selected} loses its place and targets ${base.text}.`
    if (!above.length)
      return `${target} Add it again to join at the end of the queue.`
    const names = listText(
      above.map((item) =>
        item.number === undefined
          ? item.name
          : `${item.name} (#${item.number})`,
      ),
    )
    const one = above.length === 1
    return `${target} ${names} ${one ? 'builds' : 'build'} on this pull request, so ${one ? 'it leaves' : 'they leave'} the queue too. Add them again to join at the end of the queue.`
  },
  cancel: 'Cancel',
  confirm: 'Remove',
} as const

/** What a screen reader hears while a drag moves an entry in its queue. */
export function queueMoveStatus(name: string, place: number): string {
  return `Moving ${name} to place ${place} of the merge queue`
}

/** What a screen reader hears while a row of a section is over the group. */
export function queueAddStatus(name: string, place: number): string {
  return `Adding ${name} to the merge queue at place ${place}`
}

/**
 * Why a workspace cannot join the queue of its repository: its branch has
 * no open pull request, its unit targets another branch than the default
 * branch, its pull request comes from a fork, the member has no write
 * access to the repository, the default branch needs GitHub's own merge
 * queue, or another org already has a queue with entries for the
 * repository.
 */
export type JoinRefusal =
  | { kind: 'no-pull-request' }
  | {
      kind: 'other-branch'
      base: MergeQueueBranchLabel
      trunk: MergeQueueBranchLabel
    }
  | { kind: 'fork' }
  | { kind: 'write-access'; repository: string }
  | { kind: 'github-merge-queue'; trunk: MergeQueueBranchLabel }
  | { kind: 'other-org' }

/**
 * The reason that the group names during a drag of a row that cannot join,
 * in place of its drop line or of the words of its zone. The group then
 * takes no drop, so a drop never fails without a reason.
 */
export function joinRefusalText(refusal: JoinRefusal): string {
  switch (refusal.kind) {
    case 'no-pull-request':
      return 'Open a pull request to add it to the queue.'
    case 'other-branch':
      return `It targets ${refusal.base.text}. The queue merges into ${refusal.trunk.text}.`
    case 'fork':
      return "Pull requests from forks can't join the queue."
    case 'write-access':
      return `You need write access to ${refusal.repository}.`
    case 'github-merge-queue':
      return `${refusal.trunk.text} needs GitHub's own merge queue.`
    case 'other-org':
      return 'Another org has a merge queue for this repository.'
  }
}

/** What a screen reader hears while a row that cannot join is over the group. */
export function queueRefusedStatus(name: string, reason: string): string {
  return `${name} can't join the merge queue. ${reason}`
}
