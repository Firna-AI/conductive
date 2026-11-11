/**
 * The branches and the open pull requests of acme/storefront on GitHub,
 * which the branch picker of New workspace offers. The picker leaves out
 * the default branch, main.
 */

import { pullRequest } from './pullRequests'
import { repositories } from './repositories'
import {
  checkoutAutocomplete,
  savedCarts,
  workspaceLink,
  type Workspace,
} from './workspaces'

/**
 * A repository on GitHub. Its ID names it, because a branch name alone can
 * name a branch of another repository, such as its default branch.
 */
type GitHubRepository = { id: number; name: string }

/** The chosen repository of the picker, acme/storefront. */
const pickerRepository: GitHubRepository = {
  id: 731402586,
  name: repositories.storefront.name,
}

/**
 * An open pull request, the branch that a new workspace continues, and the
 * head repository that holds that branch.
 */
export type PullRequestChoice = {
  number: number
  title: string
  branch: string
  head: GitHubRepository
}

/** A branch without an open pull request, and the age of its last commit. */
export type BranchChoice = { name: string; updated: string }

/**
 * The open pull requests, the newest first. The second is the pull request
 * of Checkout address autocomplete, a workspace that is still open. A new
 * workspace can continue its branch too, and nothing warns. The third
 * comes from the fork lena-ko/storefront, whose branch is named main, as
 * the default branch of acme/storefront is.
 */
export const openPullRequests: readonly PullRequestChoice[] = [
  {
    number: 486,
    title: 'Gift cards at checkout',
    branch: 'priyaraman/gift-cards',
    head: pickerRepository,
  },
  {
    number: pullRequest.number,
    title: pullRequest.title,
    branch: checkoutAutocomplete.branch,
    head: pickerRepository,
  },
  {
    number: 477,
    title: 'Polish translations for checkout',
    branch: 'main',
    head: { id: 902718344, name: 'lena-ko/storefront' },
  },
]

/**
 * Whether a new workspace can continue a pull request: only when its head
 * repository is the chosen repository, by ID. A pull request from another
 * repository, such as a fork, cannot be chosen.
 */
export function continuable(item: PullRequestChoice): boolean {
  return item.head.id === pickerRepository.id
}

/** The address of a pull request on GitHub, in the chosen repository. */
export function pullRequestHref(item: PullRequestChoice): string {
  return `https://github.com/${pickerRepository.name}/pull/${item.number}`
}

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

/**
 * What a search types: one that finds a pull request, one that does not,
 * and one that finds the pull request from a fork.
 */
export const branchSearches = {
  found: 'gift',
  none: 'tax',
  fork: 'polish',
} as const
