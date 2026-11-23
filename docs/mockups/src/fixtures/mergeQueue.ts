import type {
  PromptFacts,
  RestackFacts,
} from '../../../../src/ui/components/workspace/barCopy'
import { promptFacts } from './barActions'
import { pullRequest } from './pullRequests'
import { subWorkspaceList } from './subWorkspaces'
import { savedCarts, workspaceList, type Workspace } from './workspaces'

/**
 * The merge queues of Acme: the pull requests of the workspaces that they
 * hold, and the facts that the one turn of the queue and Resolve conflicts
 * name. Only the pages of the merge queue draw a queue. The other pages
 * keep the list of Acme without one.
 */

/** The pull request of each workspace that a queue holds, by its key. */
const queuedPullRequests: Readonly<Record<string, number>> = {
  'next-16': 476,
  'apple-pay': 479,
  'checkout-autocomplete': pullRequest.number,
  'fix-cart-flake': 486,
  'places-client': 488,
  'saved-carts': 490,
  'webhook-retries': 318,
  'retry-queue': 321,
}

/** The number of the pull request of a queued workspace. */
export function pullRequestOf(key: string): number {
  const number = queuedPullRequests[key]
  if (number === undefined) throw new Error(`No pull request for ${key}`)
  return number
}

/**
 * The workspaces that a queue can hold: those of the list of Acme, the
 * sub-workspaces, and Saved carts, which a member stacked on the branch of
 * Checkout address autocomplete (decision 301).
 */
const queueable: readonly Workspace[] = [
  ...workspaceList,
  ...subWorkspaceList,
  savedCarts,
]

/** The workspace of a key that a queue holds. */
export function queuedWorkspace(key: string): Workspace {
  const workspace = queueable.find((item) => item.key === key)
  if (!workspace) throw new Error(`No workspace ${key}`)
  return workspace
}

/**
 * The release branch of acme/storefront, which the branch picker lists. On
 * the page of a row that cannot join, the pull request of Fix flaky cart
 * test targets it, so the queue, which merges into main, takes no drop of
 * the row.
 */
export const releaseBranch = 'release/2026.11'

/** The branch of Apple Pay button, #479, the layer below #482. */
const applePayBranch = queuedWorkspace('apple-pay').branch

/**
 * The restack of #482 onto the newest head of #479, after a fix of #479
 * pushed new commits and the rebase of GitHub hit a conflict.
 */
export const restackFacts: RestackFacts = {
  number: pullRequest.number,
  basePullNumber: pullRequestOf('apple-pay'),
  label: { text: applePayBranch },
  baseHead: '4c1e9a204370727cafd6e1c4d5184da48275f062',
  oldBase: '9b07d3fdee7cbfe75bcd09c0b27c8fd8db6e910a',
}

/**
 * The facts of #482 while it is queued on #479: Resolve conflicts asks
 * for a rebase onto the branch of #479.
 */
export const queuedPromptFacts: PromptFacts = {
  ...promptFacts,
  base: applePayBranch,
  rebase: restackFacts,
}
