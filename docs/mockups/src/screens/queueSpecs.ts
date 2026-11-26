import { queuePaths } from '../queuePaths'
import type { LayerSpec, QueueSpec } from './queueLists'

/**
 * The merge queues of Acme in the states that the pages draw. The queue of
 * acme/storefront holds Upgrade to Next.js 16 (#476), Apple Pay button
 * (#479), Checkout address autocomplete (#482), and Fix flaky cart test
 * (#486), in the orders of each state. Place 1 merges first.
 */

type Step = LayerSpec['step']

/** A layer that waits for its checks runs them, and the others passed. */
function githubOf(step: Step): LayerSpec['github'] {
  return step === 'waiting' ? 'checks-running' : 'ready-to-merge'
}

const nextJs = (step: Step): LayerSpec => ({
  key: 'next-16',
  step,
  github: githubOf(step),
})

const applePay = (step: Step): LayerSpec => ({
  key: 'apple-pay',
  step,
  github: githubOf(step),
  ...(step === 'rebasing' ? ({ status: 'working' } as const) : {}),
})

/** Checkout address autocomplete, which opens the bar of its state. */
const autocomplete = (step: Step, to: string): LayerSpec => ({
  key: 'checkout-autocomplete',
  step,
  github: githubOf(step),
  ...(step === 'rebasing' ? ({ status: 'working' } as const) : {}),
  to,
})

/**
 * A layer whose checks failed. The queue sends it no fix turn, so its
 * agent does not work, and it waits in its place for a member.
 */
export function failedLayer(key: string): LayerSpec {
  return { key, step: 'waiting', github: 'checks-failed', status: 'ready' }
}

/** Fix flaky cart test, whose checks failed. */
const cartFailed = failedLayer('fix-cart-flake')

/**
 * One queue with a layer in each look: ready, failed checks, waiting for
 * checks, and rebasing. Fix flaky cart test, place 2, cannot merge, so it
 * keeps its place on the line, and the two layers above it wait for it.
 */
export const oneQueue: QueueSpec = [
  {
    repository: 'storefront',
    stack: [
      nextJs('ready'),
      cartFailed,
      applePay('waiting'),
      autocomplete('rebasing', queuePaths.restack),
    ],
  },
]

/**
 * The merge of the two bottom layers, while the layer above them runs its
 * checks and the top layer waits for a member who fixes its checks.
 */
export const mergingQueue: QueueSpec = [
  {
    repository: 'storefront',
    stack: [
      nextJs('merging'),
      applePay('merging'),
      autocomplete('waiting', queuePaths.bar),
      cartFailed,
    ],
  },
]

/** The two layers that stay after that merge, from place 1 again. */
export const mergedQueue: QueueSpec = [
  {
    repository: 'storefront',
    stack: [autocomplete('waiting', queuePaths.bottom), cartFailed],
  },
]

/** Two queues: acme/storefront and acme/billing-service. */
export const twoQueues: QueueSpec = [
  {
    repository: 'storefront',
    stack: [
      nextJs('ready'),
      applePay('waiting'),
      autocomplete('waiting', queuePaths.bar),
    ],
  },
  {
    repository: 'billing-service',
    stack: [
      {
        key: 'webhook-retries',
        step: 'ready',
        github: 'ready-to-merge',
        status: 'unread',
      },
      {
        key: 'retry-queue',
        step: 'rebasing',
        github: 'ready-to-merge',
        status: 'working',
      },
    ],
  },
]

/**
 * A member stack as one unit: Saved carts (#490) stacks on Checkout address
 * autocomplete (#482), because a member started it from that branch.
 */
export const stackQueue: QueueSpec = [
  {
    repository: 'storefront',
    stack: [
      nextJs('ready'),
      { ...autocomplete('ready', queuePaths.removeStack), unit: 'first' },
      {
        key: 'saved-carts',
        step: 'waiting',
        github: 'checks-running',
        status: 'ready',
        unit: 'last',
      },
      applePay('rebasing'),
    ],
  },
]

/** The queue of the drags: three layers that wait or are ready. */
export const dragQueue: QueueSpec = [
  {
    repository: 'storefront',
    stack: [
      nextJs('ready'),
      applePay('waiting'),
      autocomplete('waiting', queuePaths.bar),
    ],
  },
]

/** The queue before Checkout address autocomplete joins: two layers. */
export const twoLayers: QueueSpec = [
  { repository: 'storefront', stack: [nextJs('ready'), applePay('waiting')] },
]

/**
 * A queued parent and a queued sub-workspace: Checkout address
 * autocomplete, the top of the deepest tree, and Places API client, the
 * middle of that tree.
 */
export const treeQueue: QueueSpec = [
  {
    repository: 'storefront',
    stack: [
      autocomplete('ready', queuePaths.bar),
      { key: 'places-client', step: 'waiting', github: 'checks-running' },
    ],
  },
]

/** The queue after Checkout address autocomplete left it. */
export const treeLeftQueue: QueueSpec = [
  {
    repository: 'storefront',
    stack: [
      { key: 'places-client', step: 'waiting', github: 'checks-running' },
    ],
  },
]
