import type { GitHubSummary } from '../../../shared/generated/GitHubSummary'

/**
 * The merge queue as the pull request bar reads it. One queue lands the
 * pull requests of one repository into its default branch, as one GitHub
 * stack (decisions 313 and 320). Place 1 is the bottom layer of the stack,
 * which merges first. This module imports no fixture, so the app can take
 * the rule from here too.
 */

/**
 * The step of an entry in the stack: it waits, for its checks or for a
 * member who fixes its pull request, it moves onto the newest head of the
 * layer below it, it is ready to merge, or it merges. GitHub's rebase
 * makes the move (decision 319 B). On a conflict of the move, the queue
 * sends one agent turn as the queuer, and the move lasts until that turn
 * ends (decision 321 A). When the conflict stays, the entry waits for a
 * member, as an entry that cannot merge does.
 */
export const queueSteps = ['waiting', 'rebasing', 'ready', 'merging'] as const

export type QueueStep = (typeof queueSteps)[number]

/**
 * Why the queue could not merge a layer that is ready: the stored GitHub
 * token of its queuer failed, or GitHub refused the merge. The entry keeps
 * its place, and the line under its bar names the reason.
 */
export const mergeProblems = ['token-failed', 'merge-refused'] as const

export type MergeProblem = (typeof mergeProblems)[number]

/**
 * What holds a message that the queue sends as the queuer, such as the one
 * turn for a conflict of a move (decision 321 A): a turn that runs in a
 * session of the workspace, no agent login of the session for the queuer,
 * or no open session. The entry waits in its place, and the line under its
 * bar names the reason.
 */
export const turnWaits = ['active-turn', 'agent-login', 'open-session'] as const

export type TurnWait = (typeof turnWaits)[number]

export const queueWaits = ['local-work', 'trunk-change'] as const

type QueueWait = (typeof queueWaits)[number]

/**
 * The GitHub states of a pull request that cannot merge until a member
 * acts: failed checks, a conflict, requested changes, and a block of the
 * rules of GitHub. Its list mark is red or amber. The queue sends it no fix
 * turn. The entry keeps its place, the layers below it still merge, and
 * the layers above it wait for it.
 */
const memberStates: ReadonlySet<GitHubSummary> = new Set([
  'checks-failed',
  'conflict',
  'changes-requested',
  'blocked',
])

/** A pull request that cannot merge until a member acts. */
export function cannotMerge(github: GitHubSummary | null): boolean {
  return github !== null && memberStates.has(github)
}

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
   * The lowest layer below it that the queue waits for: one that cannot
   * merge until a member acts, or, while this layer is ready, one that is
   * not ready yet. Its Merge waits for that layer (decision 316).
   */
  waitsFor?: number
  /** A member can rebase this layer onto the intended base. */
  waitsForRebase?: true
  /** The count from the queue when a member can land this layer and the ones ahead. */
  mergeAhead?: number
  /** Why the queue could not merge it, while it is ready. */
  problem?: MergeProblem
  /** A check of the local work or default branch that has to finish. */
  queueWait?: QueueWait
  /** What holds the message that the queue sends as the queuer. */
  turnWait?: TurnWait
  /**
   * The layers above it in its member stack, which Remove from queue takes
   * along, because the stack moves as one unit (decision 315).
   */
  stackedAbove?: number
}

/**
 * The queue facts of the workspace of a bar. `open` is a pull request that
 * can join, because its unit targets the default branch. `entry` is a
 * layer of the stack.
 */
export type QueueFacts = { kind: 'open' } | EntryFacts

/**
 * The line under the bar of a queued workspace: its place, and the pull
 * request below it or what the queue waits for. `remove`: the viewer may
 * change the queue, so the line offers Remove from queue. `localWork`: the
 * cloud computer holds work that is not pushed, so the queue waits for the
 * push before it merges the layer, as the bar puts Commit and push before
 * Merge (decision 228).
 */
export type QueueLine = EntryFacts & { remove: boolean; localWork?: true }

/** What the bar shows of the merge queue. */
export type BarQueue = {
  /** Add to merge queue, the outline button after the main action. */
  add: boolean
  line?: QueueLine
}

/**
 * What the bar shows of the queue. Add to merge queue shows on an open
 * pull request that can join, which Add puts at the top of the stack
 * (decision 317). A queued workspace shows its line in its place. Only a
 * member with write access changes the queue, as for Merge (decision
 * 221), and a layer that merges cannot leave. `bar`: the pull request is
 * open, the viewer may change the queue, and the cloud computer holds
 * local work. The line takes the local work of the bar, so its words and
 * Commit and push always agree.
 */
export function barQueueOf(
  queue: QueueFacts | undefined,
  bar: { open: boolean; change: boolean; localWork: boolean },
): BarQueue | undefined {
  if (queue === undefined) return undefined
  if (queue.kind === 'open') {
    return bar.open && bar.change ? { add: true } : undefined
  }
  // A layer that merges cannot leave, so its line offers no Remove.
  const remove = bar.change && queue.step !== 'merging'
  const local = bar.localWork ? ({ localWork: true } as const) : {}
  return { add: false, line: { ...queue, remove, ...local } }
}

/**
 * Merge on a queued workspace (decision 316): shown only while the layer
 * and each layer below it are in the stack and ready, and busy while the
 * queue merges them. `below` counts the layers that land with it. Null:
 * no Merge, because the layer or a layer below it is not ready. Undefined:
 * the bar keeps the Merge of a workspace outside the queue.
 */
export function queuedMerge(
  queue: QueueFacts | undefined,
): { below: number; busy: boolean } | null | undefined {
  if (queue === undefined || queue.kind === 'open') return undefined
  const below = queue.place - 1
  if (queue.step === 'merging') return { below, busy: true }
  if (queue.mergeAhead !== undefined)
    return { below: queue.mergeAhead, busy: false }
  const whole = queue.step === 'ready' && queue.waitsFor === undefined
  return whole ? { below, busy: false } : null
}
