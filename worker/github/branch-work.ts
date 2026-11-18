import { githubFailure } from './parsers'
import type { GitHubSnapshot } from './contracts'

/** The GitHub work of a branch that a repository change stops following. */
export interface BranchWork {
  /** The open pull request of the branch. */
  pullRequest: { number: number; url: string } | null
  /** The pushed commits of the branch that its base branch does not hold. */
  pushedCommits: number
}

/**
 * Reads the work from a fresh snapshot of the branch. A merged or closed
 * pull request is not such work. A merged pull request holds its commits,
 * also after a squash merge, so its branch counts no pushed commits.
 */
export async function readBranchWork(
  snapshot: GitHubSnapshot | null,
  aheadBy: (baseBranch: string, headSha: string) => Promise<number>,
): Promise<BranchWork> {
  if (!snapshot) throw githubFailure()
  const { banner, headSha } = snapshot
  const pullRequest =
    banner.pullRequest && banner.state !== 'merged' && banner.state !== 'closed'
      ? { number: banner.pullRequest.number, url: banner.pullRequest.url }
      : null
  if (
    headSha === null ||
    banner.state === 'merged' ||
    banner.state === 'no-commits'
  )
    return { pullRequest, pushedCommits: 0 }
  return {
    pullRequest,
    pushedCommits: await aheadBy(banner.baseBranch, headSha),
  }
}
