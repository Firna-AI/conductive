import {
  continuable,
  openPullRequests,
  otherBranches,
} from '../../../docs/mockups/src/fixtures/branches'
import type { Repository } from '../../shared/org-settings'
import type { WorkspaceBranchOption } from '../../shared/workspace-branches'

/**
 * The rows of the branch picker of a repository, from the mockups, as the
 * Worker sends them: the open pull requests, the newest first, then the
 * branches without one. The third pull request comes from a fork, so its
 * branch is in another repository. The default branch is not a row.
 */
export function branchFixtures(
  repository: Pick<Repository, 'fullName' | 'githubId'>,
): WorkspaceBranchOption[] {
  const pullRequests = openPullRequests.map((item): WorkspaceBranchOption => ({
    type: 'pull-request',
    number: item.number,
    title: item.title,
    url: `https://github.com/${repository.fullName}/pull/${item.number}`,
    branch: item.branch,
    headRepositoryId: continuable(item) ? repository.githubId : item.head.id,
    availability: continuable(item) ? 'available' : 'another-repository',
  }))
  const branches = otherBranches.map((item): WorkspaceBranchOption => ({
    type: 'branch',
    name: item.name,
  }))
  return [...pullRequests, ...branches]
}
