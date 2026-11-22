import type { GitHubSummary } from '../../../../../src/shared/generated/GitHubSummary'
import { mergeLabels, type MergeMethod } from './barCopy'
import type { AttentionReason, QueueLine } from './queueModel'

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
  attention: 'Needs attention',
  drop: 'Drop here to add to the merge queue',
} as const

/**
 * The label of Merge on a queued workspace. It counts the layers ahead of
 * it in the queue, which land with it (decision 316). "Ahead" reads with
 * the list, where place 1 shows first. The bottom layer lands alone, so its
 * label names the merge method, as Merge outside the queue does.
 */
export function queuedMergeLabel(method: MergeMethod, below?: number): string {
  if (below === undefined || below === 0) return mergeLabels[method]
  return `Merge with ${below} ahead`
}

/** The pull request below a layer, or the default branch below the bottom. */
function belowName(below: number | null, trunk: string): string {
  return below === null ? trunk : `#${below}`
}

/** The fix turn of a layer, in the words of the GitHub state that it fixes. */
function fixingLabel(github: GitHubSummary | null): string {
  switch (github) {
    case 'conflict':
      return 'Resolving conflicts'
    case 'changes-requested':
      return 'Addressing review'
    default:
      return 'Fixing checks'
  }
}

/** Why an entry needs attention, in the line under its bar. */
function attentionLine(reason: AttentionReason, trunk: string): string {
  switch (reason) {
    case 'checks-still-fail':
      return 'the checks still fail after one fix.'
    case 'conflict-remains':
      return 'the conflict is still there after one fix.'
    case 'changes-still-requested':
      return 'a reviewer still requests changes after one fix.'
    case 'work-not-pushed':
      return "the cloud computer has work that isn't pushed."
    case 'turn-runs':
      return "a turn ran for 30 minutes, so the fix didn't start."
    case 'token-failed':
      return 'the GitHub access of the member who added it stopped working.'
    case 'no-agent-login':
      return 'no agent login can run the fix.'
    case 'merge-refused':
      return 'GitHub refused the merge.'
    case 'other-org':
      return 'another org queues this repository.'
    case 'github-merge-queue':
      return `${trunk} needs GitHub's own merge queue.`
  }
}

/**
 * The line under the bar of a queued workspace: its place and the pull
 * request below it, with what its step does, or why it needs attention.
 * `github` is the GitHub state of its pull request, which names a fix.
 */
export function queueLineText(
  line: QueueLine,
  context: { trunk: string; github: GitHubSummary | null },
): string {
  const { trunk } = context
  if (line.kind === 'attention') {
    return `${queueLabels.attention}: ${attentionLine(line.reason, trunk)}`
  }
  const place = `Place ${line.place} of ${line.size} in the merge queue.`
  const below = belowName(line.below, trunk)
  switch (line.step) {
    case 'waiting':
    case 'ready':
      return line.waitsFor === undefined
        ? `${place} It builds on ${below}.`
        : `${place} It builds on ${below} and waits for #${line.waitsFor}.`
    case 'rebasing':
      return `${place} Rebasing onto ${below}.`
    case 'fixing':
      return `${place} ${fixingLabel(context.github)}.`
    case 'merging':
      return `${place} Merging into ${trunk}.`
  }
}

/** The place of a queued workspace in the compact row of a phone. */
export function queueRowText(line: QueueLine): string {
  if (line.kind === 'attention') return queueLabels.attention
  return `Queue ${line.place} of ${line.size}`
}

/** A pull request that leaves the queue with the one that a member removes. */
export type LeavingLayer = { name: string; number: number }

/** A list in running text: "a", "a and b", or "a, b, and c". */
function listText(items: readonly string[]): string {
  if (items.length < 3) return items.join(' and ')
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

/**
 * The words of the question before Remove from queue. A lower entry of a
 * member stack takes the entries above it in its unit along, because a
 * member stack moves as one unit (decision 315), and the question names
 * them.
 */
export const removeQuestion = {
  title: 'Remove from the merge queue?',
  alone: (number: number, trunk: string) =>
    `Pull request #${number} loses its place and targets ${trunk} again. Add it again to join at the end of the queue.`,
  withUnit: (above: readonly LeavingLayer[]) => {
    const names = listText(
      above.map((item) => `${item.name} (#${item.number})`),
    )
    const one = above.length === 1
    return `${names} ${one ? 'builds' : 'build'} on this pull request, so ${one ? 'it leaves' : 'they leave'} the queue too. Add them again to join at the end of the queue.`
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
 * branch, its pull request comes from a fork, or the member has no write
 * access to the repository.
 */
export type JoinRefusal =
  | { kind: 'no-pull-request' }
  | { kind: 'other-branch'; base: string; trunk: string }
  | { kind: 'fork' }
  | { kind: 'write-access'; repository: string }

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
      return `It targets ${refusal.base}. The queue merges into ${refusal.trunk}.`
    case 'fork':
      return "Pull requests from forks can't join the queue."
    case 'write-access':
      return `You need write access to ${refusal.repository}.`
  }
}

/** What a screen reader hears while a row that cannot join is over the group. */
export function queueRefusedStatus(name: string, reason: string): string {
  return `${name} can't join the merge queue. ${reason}`
}
