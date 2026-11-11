import { useEffect, useMemo } from 'react'
import type { GitHubFeed, GitHubState } from '../../../github/githubStore'

const loading: GitHubState = { status: 'loading' }

/**
 * The GitHub feed of the workspace branch. A state of another branch, such
 * as the state of the merged branch just after Continue, shows as loading,
 * so no old Merge or Continue stays. The store then reads the state of the
 * branch once, and the events of the new branch follow.
 */
export function useBranchFeed(github: GitHubFeed, branch: string): GitHubFeed {
  const { state, retry } = github
  const other =
    state.status === 'ready' && state.snapshot.banner.branch !== branch
  useEffect(() => {
    if (other) retry()
  }, [other, branch, retry])
  return useMemo(
    () => (other ? { state: loading, retry } : github),
    [other, github, retry],
  )
}
