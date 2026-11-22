/**
 * The merge queue as the pull request bar reads it. One queue lands the
 * pull requests of one repository into its default branch, as one GitHub
 * stack (decisions 313 and 320). Place 1 is the bottom layer of the stack,
 * which merges first. This module imports no fixture, so the app can take
 * the rule from here too.
 */

/**
 * The step of an entry in the stack: it waits for its checks, it moves
 * onto the newest head of the layer below it, it gets its one fix turn, it
 * is ready to merge, or it merges.
 */
export const queueSteps = [
  'waiting',
  'rebasing',
  'fixing',
  'ready',
  'merging',
] as const

export type QueueStep = (typeof queueSteps)[number]

/**
 * Why an entry left the stack and waits for a member: its one fix turn did
 * not fix the checks, the conflict, or the review, the cloud computer kept
 * work that is not pushed for 30 minutes, a turn ran for 30 minutes, the
 * stored GitHub token of its queuer failed, the session has no agent
 * login, GitHub refused the merge, another org queues the repository, or
 * the default branch needs GitHub's own merge queue.
 */
export const attentionReasons = [
  'checks-still-fail',
  'conflict-remains',
  'changes-still-requested',
  'work-not-pushed',
  'turn-runs',
  'token-failed',
  'no-agent-login',
  'merge-refused',
  'other-org',
  'github-merge-queue',
] as const

export type AttentionReason = (typeof attentionReasons)[number]

/** A layer of the stack. */
type EntryFacts = {
  kind: 'entry'
  /** Its place, from 1 for the bottom layer. */
  place: number
  /** The count of the layers of the stack. */
  size: number
  /** The pull request below it, or null for the bottom layer. */
  below: number | null
  step: QueueStep
  /**
   * The lowest layer below it that is not ready to merge yet, if any. Its
   * Merge waits for that layer (decision 316).
   */
  waitsFor?: number
  /**
   * The layers above it in its member stack, which Remove from queue takes
   * along, because the stack moves as one unit (decision 315).
   */
  stackedAbove?: number
}

/** An entry below the stack, which left it and waits for a member. */
type AttentionFacts = { kind: 'attention'; reason: AttentionReason }

/**
 * The queue facts of the workspace of a bar. `open` is a pull request that
 * can join, because its unit targets the default branch. `entry` is a
 * layer of the stack, and `attention` an entry that needs a member.
 */
export type QueueFacts = { kind: 'open' } | EntryFacts | AttentionFacts

/**
 * The line under the bar of a queued workspace: its place and the pull
 * request below it, or why it needs attention. `remove`: the viewer may
 * change the queue, so the line offers Remove from queue.
 */
export type QueueLine = (EntryFacts | AttentionFacts) & { remove: boolean }

/** What the bar shows of the merge queue. */
export type BarQueue = {
  /** Add to merge queue, the outline button after the main action. */
  add: boolean
  line?: QueueLine
}

/**
 * What the bar shows of the queue. Add to merge queue shows on an open
 * pull request that can join, and on an entry that needs attention, which
 * Add joins again at the top of the stack (decision 317). Only a member
 * with write access changes the queue, as for Merge (decision 221), and a
 * layer that merges cannot leave.
 */
export function barQueueOf(
  queue: QueueFacts | undefined,
  can: { open: boolean; change: boolean },
): BarQueue | undefined {
  if (queue === undefined) return undefined
  const add = can.open && can.change
  switch (queue.kind) {
    case 'open':
      return add ? { add } : undefined
    case 'entry': {
      // A layer that merges cannot leave, so its line offers no Remove.
      const remove = can.change && queue.step !== 'merging'
      return { add: false, line: { ...queue, remove } }
    }
    case 'attention':
      return { add, line: { ...queue, remove: can.change } }
  }
}

/**
 * Merge on a queued workspace (decision 316): shown only while the layer
 * and each layer below it are in the stack and ready, and busy while the
 * queue merges them. `below` counts the layers that land with it. Null:
 * no Merge, because the layer or a layer below it is not ready, or the
 * entry left the stack. Undefined: the bar keeps the Merge of a workspace
 * outside the queue.
 */
export function queuedMerge(
  queue: QueueFacts | undefined,
): { below: number; busy: boolean } | null | undefined {
  if (queue === undefined || queue.kind === 'open') return undefined
  if (queue.kind === 'attention') return null
  const below = queue.place - 1
  if (queue.step === 'merging') return { below, busy: true }
  const whole = queue.step === 'ready' && queue.waitsFor === undefined
  return whole ? { below, busy: false } : null
}
