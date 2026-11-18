import { useEffect, useMemo } from 'react'
import type { GitHubFeed, GitHubState } from '../../../github/githubStore'
import { githubSummary } from '../../../shared/github'
import type { OrgModel } from '../../../app/org-model'

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

/**
 * Gives the GitHub state of the bar to the list mark of the workspace
 * while the screen shows it, so the mark and the bar change together. A
 * feed that loads or failed gives nothing, and the list summary shows.
 */
export function useLiveMark(
  org: OrgModel,
  workspaceId: string,
  feed: GitHubFeed,
): void {
  const { state } = feed
  const banner = state.status === 'ready' ? state.snapshot.banner : null
  const branch = banner?.branch ?? null
  const summary = banner ? githubSummary(banner) : null
  useEffect(() => {
    if (branch === null) return
    return org.liveGitHub.show(workspaceId, { branch, summary })
  }, [org, workspaceId, branch, summary])
}
