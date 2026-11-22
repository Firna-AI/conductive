import type { GitHubSummary } from '../../../../../src/shared/generated/GitHubSummary'
import { mergeLabels, type MergeMethod } from './barCopy'
import type { AttentionReason, QueueLine, QueueStep } from './queueModel'

/**
 * The words of the merge queue: the group of the list and its rows, the
 * controls, the line under the pull request bar, and the question before
 * Remove from queue. This module imports no fixture, so the app can take
 * the words from here too.
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
export function belowName(below: number | null, trunk: string): string {
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

/**
 * The step of a layer in its row, under its name. `below` names the pull
 * request below it, or the default branch, as `belowName` gives it.
 */
export function queueStepLabel(
  step: QueueStep,
  below: string,
  github: GitHubSummary | null,
): string {
  switch (step) {
    case 'waiting':
      return 'Waiting for checks'
    case 'rebasing':
      return `Rebasing onto ${below}`
    case 'fixing':
      return fixingLabel(github)
    case 'ready':
      return 'Ready to merge'
    case 'merging':
      return 'Merging'
  }
}

/** Why an entry needs attention, in the row under its name. */
export function attentionRowLabel(reason: AttentionReason): string {
  switch (reason) {
    case 'checks-still-fail':
      return 'Checks still fail'
    case 'conflict-remains':
      return 'Conflict remains'
    case 'changes-still-requested':
      return 'Changes still requested'
    case 'work-not-pushed':
      return 'Work not pushed'
    case 'turn-runs':
      return 'Agent stayed busy'
    case 'token-failed':
      return 'GitHub access failed'
    case 'no-agent-login':
      return 'No agent login'
    case 'merge-refused':
      return 'Merge refused'
    case 'other-org':
      return 'Queued in another org'
    case 'github-merge-queue':
      return "Needs GitHub's merge queue"
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
