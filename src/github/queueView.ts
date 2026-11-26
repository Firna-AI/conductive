import type { MergeQueueBarState } from '../shared/generated/MergeQueueBarState'
import type { MergeQueueEntryState } from '../shared/generated/MergeQueueEntryState'
import {
  queueLineText,
  defaultQueueBranchLabel,
  queueRowText,
  resetBaseFailedText,
} from '../ui/components/workspace/queueCopy'
import type {
  BarQueue,
  MergeProblem,
  QueueFacts,
  QueueStep,
  TurnWait,
} from '../ui/components/workspace/queueModel'
import { githubSummary } from '../shared/github'
import { baseBranchLabel } from './bannerStatus'
import type { GitHubSnapshot } from './githubClient'

/**
 * What the bar knows of the merge queue beside its GitHub state, from the
 * list of the org: whether the list holds the workspace as an entry, and
 * whether its pull request can join, by write access and a unit that
 * targets the default branch (decision 320).
 */
export interface QueueInput {
  listed: boolean
  canJoin: boolean
  /** Add to merge queue runs, so its button shows busy. */
  adding: boolean
}

/** The line under the bar of a queued workspace. */
export interface QueueLineView {
  text: string
  /** A step runs, so a spinner takes the place of the icon. */
  running: boolean
  /** Remove from queue ends the line. */
  remove: boolean
  /** GitHub refused the merge, so the line leads to the pull request. */
  href: string | null
}

/** What the bar, the phone row, and the top of the Checks tab show of the queue. */
export interface QueueView {
  /** Add to merge queue, the outline button after the main action. */
  add: boolean
  adding: boolean
  line: QueueLineView | null
  /** The place in the compact row of a phone, such as "Queue 3 of 3". */
  row: string | null
}

/** The step that the queue reports for this entry. */
function stepOf(state: MergeQueueEntryState): QueueStep {
  switch (state) {
    case 'restacking':
      return 'rebasing'
    case 'merging':
      return 'merging'
    case 'queued':
    case 'waiting':
      return 'waiting'
  }
}

/** Why the queue could not merge a layer, when the bar read names it. */
function problemOf(queue: MergeQueueBarState): MergeProblem | undefined {
  if (queue.wait === 'token') return 'token-failed'
  if (queue.wait === 'merge-refused') return 'merge-refused'
  return undefined
}

/** What holds the message that the queue sends as the queuer, if any. */
function turnWaitOf(queue: MergeQueueBarState): TurnWait | undefined {
  switch (queue.wait) {
    case 'active-turn':
    case 'agent-login':
    case 'open-session':
      return queue.wait
    default:
      return undefined
  }
}

/**
 * The queue facts of the bar: a layer of the stack from the bar read, or a
 * pull request that can join, which neither the bar nor the list holds as
 * an entry.
 */
export function queueFactsOf(
  queue: MergeQueueBarState | undefined,
  input: QueueInput | undefined,
): QueueFacts | undefined {
  if (queue) {
    const problem = problemOf(queue)
    const turnWait = turnWaitOf(queue)
    return {
      kind: 'entry',
      place: queue.place,
      size: queue.count,
      below: queue.belowPullNumber,
      step: stepOf(queue.state),
      ...(problem && { problem }),
      ...(turnWait && { turnWait }),
      ...((queue.wait === 'local-work' || queue.wait === 'trunk-change') && {
        queueWait: queue.wait,
      }),
      ...(queue.state === 'waiting' &&
        queue.wait === 'rebase' && {
          waitsForRebase: true as const,
        }),
      ...(queue.wait === 'lower-layer' &&
        queue.blockedByPullNumber !== undefined && {
          waitsFor: queue.blockedByPullNumber,
        }),
      ...(queue.mergeAhead !== undefined && { mergeAhead: queue.mergeAhead }),
    }
  }
  if (input && !input.listed && input.canJoin) return { kind: 'open' }
  return undefined
}

/**
 * The queue of the bar as the views draw it: Add to merge queue, and the
 * line of a queued workspace with its words. The trunk shows by the label
 * of the base when the base is the trunk, which hides each secret value.
 */
export function queueViewOf(
  bar: BarQueue | undefined,
  snapshot: GitHubSnapshot,
  input: QueueInput | undefined,
): QueueView | null {
  const { banner, queue, queueLeave } = snapshot
  if (!bar && !queueLeave) return null
  const line = bar?.line
  const trunk =
    queue?.trunkLabel ??
    (queue && queue.trunk === banner.baseBranch
      ? { text: baseBranchLabel(banner) }
      : defaultQueueBranchLabel)
  return {
    add: bar?.add ?? false,
    adding: input?.adding ?? false,
    line: line
      ? {
          text: queueLineText(
            { ...line, ...(queue?.wait === 'push' && { localWork: true }) },
            { trunk, github: githubSummary(banner) },
          ),
          running: line.step === 'rebasing' || line.step === 'merging',
          remove: line.remove,
          href:
            line.problem === 'merge-refused'
              ? (banner.pullRequest?.url ?? null)
              : null,
        }
      : queueLeave
        ? {
            text: resetBaseFailedText(queueLeave.baseBranch),
            running: false,
            remove: false,
            href: banner.pullRequest?.url ?? null,
          }
        : null,
    row: line ? queueRowText(line) : null,
  }
}
