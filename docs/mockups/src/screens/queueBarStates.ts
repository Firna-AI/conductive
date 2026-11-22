import type { QueueFacts } from '../components/workspace/queueModel'
import type { QueueMenuAction } from '../components/workspaces/rowControls'
import { queuedWorkspace } from '../fixtures/mergeQueue'
import { queuePaths } from '../queuePaths'
import {
  queueFactsOf,
  unitAbove,
  type LayerSpec,
  type QueueSpec,
} from './queueLists'
import { stackQueue, twoLayers } from './queueSpecs'

/**
 * The merge queue of the open workspace, Checkout address autocomplete
 * (#482), as values of the `queue` prop of the workspace screen: no queue,
 * the queue of acme/storefront that it can join, place 3 of 3, the bottom
 * layer, a restack, its fix turn of a conflict, Merge with the layers below
 * it, that merge, a Merge that waits for a lower layer, Merge of the bottom
 * layer, an entry that needs attention after a fix or after a refused
 * merge, and the lower layer of a member stack.
 */
export const workspaceQueueStates = [
  'none',
  'open',
  'upper',
  'bottom',
  'restack',
  'rebase',
  'merge',
  'merging',
  'waits',
  'bottom-merge',
  'attention',
  'refused',
  'stack',
] as const

export type WorkspaceQueueState = (typeof workspaceQueueStates)[number]

type Step = LayerSpec['step']

/** The layers of acme/storefront in a state, place 1 first. */
function storefront(...stack: LayerSpec[]): QueueSpec {
  return [{ repository: 'storefront', stack }]
}

/** A layer of a workspace of the list, other than the open one. */
function layer(key: string, step: Step): LayerSpec {
  const github = step === 'waiting' ? 'checks-running' : 'ready-to-merge'
  const working = step === 'rebasing' || step === 'fixing'
  return {
    key,
    step,
    github,
    ...(working ? ({ status: 'working' } as const) : {}),
  }
}

/** The open workspace. Its row shows the state of its bar. */
function open(step: Step): LayerSpec {
  return { key: 'checkout-autocomplete', step, github: 'ready-to-merge' }
}

const nextJs = (step: Step) => layer('next-16', step)
const applePay = (step: Step) => layer('apple-pay', step)

const specs: Readonly<Record<Exclude<WorkspaceQueueState, 'none'>, QueueSpec>> =
  {
    open: twoLayers,
    upper: storefront(nextJs('ready'), applePay('waiting'), open('waiting')),
    bottom: storefront(
      open('waiting'),
      nextJs('waiting'),
      applePay('rebasing'),
    ),
    restack: storefront(nextJs('ready'), applePay('ready'), open('rebasing')),
    rebase: storefront(nextJs('ready'), applePay('ready'), open('fixing')),
    merge: storefront(nextJs('ready'), applePay('ready'), open('ready')),
    merging: storefront(
      nextJs('merging'),
      applePay('merging'),
      open('merging'),
    ),
    waits: storefront(nextJs('waiting'), applePay('ready'), open('ready')),
    'bottom-merge': storefront(
      open('ready'),
      nextJs('waiting'),
      applePay('rebasing'),
    ),
    attention: [
      {
        repository: 'storefront',
        stack: [nextJs('ready'), applePay('waiting')],
        attention: [
          {
            key: 'checkout-autocomplete',
            reason: 'checks-still-fail',
            github: 'checks-failed',
          },
        ],
      },
    ],
    refused: [
      {
        repository: 'storefront',
        stack: [nextJs('ready'), applePay('waiting')],
        attention: [
          {
            key: 'checkout-autocomplete',
            reason: 'merge-refused',
            github: 'ready-to-merge',
          },
        ],
      },
    ],
    stack: stackQueue,
  }

/** The queues of a state of the workspace screen, if it draws them. */
export function queueSpecOf(
  state: WorkspaceQueueState | undefined,
): QueueSpec | undefined {
  return state === undefined || state === 'none' ? undefined : specs[state]
}

/** The key of the open workspace of the pages of the queue. */
const openKey = 'checkout-autocomplete'

/** The queue facts of the open workspace in a state, for its bar. */
export function openQueueFacts(
  state: WorkspaceQueueState | undefined,
): QueueFacts | undefined {
  const spec = queueSpecOf(state)
  return spec ? queueFactsOf(spec, openKey) : undefined
}

/**
 * The base of the open workspace in a state: the branch of the layer below
 * it, which a queued workspace stores as its base. None for the bottom
 * layer, which targets the default branch, and outside a queue.
 */
export function queueBaseOf(
  state: WorkspaceQueueState | undefined,
): string | undefined {
  for (const block of queueSpecOf(state) ?? []) {
    const place = block.stack.findIndex((item) => item.key === openKey)
    const lower = block.stack[place - 1]
    if (place > 0 && lower) return queuedWorkspace(lower.key).branch
  }
  return undefined
}

/**
 * The layers that leave the queue with the open workspace: the layers
 * above it in its member stack, by name and pull request.
 */
export function leavingWithOpen(
  state: WorkspaceQueueState | undefined,
): { key: string }[] {
  for (const block of queueSpecOf(state) ?? []) {
    const place = block.stack.findIndex((item) => item.key === openKey)
    if (place >= 0) return unitAbove(block.stack, place)
  }
  return []
}

/**
 * The item of the merge queue in the workspace menu of the header: Add to
 * merge queue for a pull request that can join, and Remove from queue for
 * a queued workspace. Both need write access.
 */
export function headerQueueAction(
  state: WorkspaceQueueState | undefined,
  write: boolean,
): QueueMenuAction | undefined {
  const facts = openQueueFacts(state)
  if (!facts || !write) return undefined
  return facts.kind === 'open' ? 'add' : 'remove'
}

/** The screen that Cancel of the question before Remove from queue shows. */
export function removeCancelPath(
  state: WorkspaceQueueState | undefined,
): string {
  return state === 'stack' ? queuePaths.stackList : queuePaths.bar
}
