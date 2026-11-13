/**
 * The facts of the repository change of Checkout address autocomplete:
 * the repository that Cal picks, the new branch, the chosen repository
 * that its cloud computer does not hold, and the work that the question
 * lists.
 */

import { unpushedWork } from './barActions'
import { people } from './members'
import { pullRequest } from './pullRequests'
import { addedRepository, type RepositoryKey } from './repositories'

/** The repository that Cal moves the workspace to. */
export const movedRepository: RepositoryKey = 'billing-service'

/**
 * The new branch in the folder of the new repository. It follows the
 * create rule: the GitHub login of the workspace owner, a city name, and
 * four random characters.
 */
export const movedBranch = `${people.cal.login}/oslo-9c1e`

/**
 * A chosen repository that the cloud computer of the workspace does not
 * hold, because a build added it after the workspace started.
 */
export const missingRepository = addedRepository

/** The work that the question of the change lists. */
export const repositoryWork = {
  /** Local work in the folder of the old repository. It stays there. */
  left: unpushedWork,
  /** The open pull request of the old branch. */
  pullRequest: pullRequest.number,
  /** The pushed commits of the old branch that its base does not hold. */
  pushedCommits: 3,
  /**
   * Local work in the folder of the new repository, from an agent that
   * edited it earlier. It moves to the new branch.
   */
  carried: { files: ['src/invoices/refunds.ts'], commits: 0 },
} as const
