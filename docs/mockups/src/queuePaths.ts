/**
 * The screens of the merge queue: the Merge queue group of the list, and
 * the pull request bar of a workspace that can join or that a queue holds.
 */
export const queuePaths = {
  /** One queue with a layer in each look, one of which cannot merge. */
  list: 'app/merge-queue',
  /** A member stack as one unit in the group. */
  stackList: 'app/merge-queue/stack',
  /** The bar after Add to merge queue: place 3 of 3, on #479. */
  bar: 'app/banner/merge-queue',
  /** The bar of a pull request that can join, with Add to merge queue. */
  add: 'app/banner/merge-queue/add',
  /** The bottom layer, on the default branch. */
  bottom: 'app/banner/merge-queue/queued',
  /**
   * The one turn of the queue, as the queuer, for a conflict of its own
   * move of a layer onto the newest head below it (decision 321 A).
   */
  restack: 'app/banner/merge-queue/queued/restack',
  /** The entry that waits for a member after that turn left the conflict. */
  rebaseWaits: 'app/banner/merge-queue/queued/rebase-waits',
  /** Resolve conflicts of a queued layer, with a rebase onto the layer below. */
  rebase: 'app/banner/merge-queue/queued/rebase',
  /** Merge with the layers below it, through the queue (decision 316). */
  merge: 'app/banner/merge-queue/merge',
  merging: 'app/banner/merge-queue/merge/merging',
  /** A layer that waits for its local work to be pushed. */
  localWork: 'app/banner/merge-queue/merge/local-work',
  /**
   * An entry that cannot merge, which keeps its place and waits for a
   * member, and the layers that wait for it.
   */
  cannotMerge: 'app/banner/merge-queue/cannot-merge',
  /** The question before Remove from queue. */
  remove: 'app/banner/merge-queue/remove',
  /** The question for the lower entry of a member stack. */
  removeStack: 'app/banner/merge-queue/remove/stack',
} as const
