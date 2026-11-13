import { people } from './members'
import { repositories } from './repositories'
import { checkoutAutocomplete } from './workspaces'

/**
 * The branches of a repository on GitHub, as the branch picker of New
 * workspace lists them (decision 291). The Worker reads them live with the
 * GitHub token of the member, and it stores no list.
 */

/** A branch of the picker: its name, and the time since its newest commit. */
export type BranchRow = {
  name: string
  /** The time since the newest commit of the branch, such as `2h`. */
  updated: string
}

/**
 * The default branch of the sample repositories, which all use `main`. The
 * branch control of New workspace shows it until the member picks another
 * branch, and the picker lists it first.
 */
export const defaultBranch = repositories.storefront.defaultBranch

const cal = people.cal.login
const priya = people.priya.login

/**
 * The other branches of acme/storefront, newest commit first: the branches
 * of workspaces, and the branches that members pushed from elsewhere.
 */
const storefrontBranches: readonly BranchRow[] = [
  { name: `${cal}/fix-cart-flake`, updated: '3m' },
  { name: `${cal}/apple-pay`, updated: '12m' },
  { name: `${cal}/next-16`, updated: '20m' },
  { name: `${priya}/checkout-tax-rates`, updated: '1h' },
  { name: checkoutAutocomplete.branch, updated: '2h' },
  { name: 'develop', updated: '1d' },
  { name: 'release/2026.11', updated: '3d' },
  { name: 'dependabot/npm_and_yarn/next-16.0.3', updated: '5d' },
]

/**
 * The branch that Cal picks in New workspace: the branch of Checkout address
 * autocomplete, whose pull request #482 waits for its merge. Saved carts
 * starts from it, and by default its work targets it, so it stacks on it.
 */
export const pickedBranch = checkoutAutocomplete.branch

/** A search of the picker that finds two branches, and one that finds none. */
export const branchSearches = { some: 'checkout', none: 'zipcode' } as const

/** The branches whose names hold the search, newest commit first. */
export function searchedBranches(query: string): readonly BranchRow[] {
  return storefrontBranches.filter((branch) => branch.name.includes(query))
}
