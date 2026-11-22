/**
 * The screens of the merge queue: the Merge queue group of the list, and
 * the pull request bar of a workspace that can join or that a queue holds.
 */
export const queuePaths = {
  /** One queue with a layer in each step, and an entry that needs attention. */
  list: 'app/merge-queue',
  /** A member stack as one unit in the group. */
  stackList: 'app/merge-queue/stack',
  /** The bar after Add to merge queue: place 3 of 3, on #479. */
  bar: 'app/banner/merge-queue',
  /** The bar of a pull request that can join, with Add to merge queue. */
  add: 'app/banner/merge-queue/add',
  /** The bottom layer, on the default branch. */
  bottom: 'app/banner/merge-queue/queued',
  /** The restack fix turn of a layer after the layer below it changed. */
  restack: 'app/banner/merge-queue/queued/restack',
  /** Resolve conflicts of a queued layer, with a rebase onto the layer below. */
  rebase: 'app/banner/merge-queue/queued/rebase',
  /** Merge with the layers below it, through the queue (decision 316). */
  merge: 'app/banner/merge-queue/merge',
  merging: 'app/banner/merge-queue/merge/merging',
  /** An entry that left the stack and waits for a member. */
  attention: 'app/banner/merge-queue/attention',
  /** The question before Remove from queue. */
  remove: 'app/banner/merge-queue/remove',
  /** The question for the lower entry of a member stack. */
  removeStack: 'app/banner/merge-queue/remove/stack',
} as const
