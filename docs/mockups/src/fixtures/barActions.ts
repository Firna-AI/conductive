/**
 * The facts behind the actions of the pull request bar: the merge method of
 * the viewer, the facts that the fixed prompts name, and the branch that
 * Continue creates.
 */

import type { MergeMethod, PromptFacts } from '../components/workspace/barCopy'
import { people } from './members'
import { changesRequestedBy, checksByState, pullRequest } from './pullRequests'
import { repositories } from './repositories'

/**
 * The method of Merge: the viewer's default merge method on GitHub, which
 * the repository allows.
 */
export const viewerMergeMethod: MergeMethod = 'squash'

/** The facts of pull request #482 that the fixed prompts name. */
export const promptFacts: PromptFacts = {
  number: pullRequest.number,
  base: repositories.storefront.defaultBranch,
  failedChecks: checksByState['checks-failed']
    .filter((check) => check.state === 'failed')
    .map((check) => check.name),
  reviewers: [changesRequestedBy],
}

/**
 * The local work of the sandbox that the question of Continue lists, and
 * that the Changes list shows.
 */
export const unpushedWork = {
  /** Changed files that are not committed. */
  files: ['src/app/checkout/AddressForm.tsx', 'tests/checkout/address.test.ts'],
  /** Commits held by no remote branch, across all local branches. */
  commits: 1,
} as const

/**
 * The branch of the workspace after Continue. It follows the create rule:
 * the GitHub login of the workspace owner, a city name, and four random
 * characters, also when another member pressed Continue.
 */
export const continuedBranch = `${people.cal.login}/porto-3f8d`
