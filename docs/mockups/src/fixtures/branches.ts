/**
 * The branches and the open pull requests of acme/storefront on GitHub,
 * which the branch picker of New workspace offers. The picker leaves out
 * the default branch, main.
 */

import { pullRequest } from './pullRequests'
import {
  checkoutAutocomplete,
  savedCarts,
  workspaceLink,
  type Workspace,
} from './workspaces'

/** An open pull request, and the branch that a new workspace continues. */
export type PullRequestChoice = {
  number: number
  title: string
  branch: string
}

/** A branch without an open pull request, and the age of its last commit. */
export type BranchChoice = { name: string; updated: string }

/**
 * The open pull requests, the newest first. The second is the pull request
 * of Checkout address autocomplete, a workspace that is still open. A new
 * workspace can continue its branch too, and nothing warns.
 */
export const openPullRequests: readonly PullRequestChoice[] = [
  {
    number: 486,
    title: 'Gift cards at checkout',
    branch: 'priyaraman/gift-cards',
  },
  {
    number: pullRequest.number,
    title: pullRequest.title,
    branch: checkoutAutocomplete.branch,
  },
]

/**
 * The other branches, the newest first. A branch with an open pull request
 * shows only as that pull request.
 */
export const otherBranches: readonly BranchChoice[] = [
  { name: 'calummoore/oslo-3f8k', updated: '2d' },
  { name: 'jonasweber/next-16-images', updated: '5d' },
  { name: 'priyaraman/footer-links', updated: '1w' },
]

/** The branch that the chosen states continue. */
export const chosenBranch = otherBranches[0]

/**
 * The workspace that Send makes from the chosen branch, with the task of
 * Saved carts. It keeps the name of that branch. Its first start fails
 * when the branch is gone from GitHub by then.
 */
export const savedCartsOnBranch: Workspace = {
  ...savedCarts,
  key: 'saved-carts-branch',
  link: workspaceLink('Lr8wKd2Qp6vXn3TzH9sYb4Fj7Gc1Mu5aEo0RiNk2Pt6'),
  branch: chosenBranch.name,
}

/** The pull request that the chosen pull request state continues. */
export const chosenPullRequest = openPullRequests[0]

/** What a search types: one that finds a pull request, and one that does not. */
export const branchSearches = { found: 'gift', none: 'tax' } as const
