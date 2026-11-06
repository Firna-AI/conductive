import type { Timestamp } from './api'
import { workspacePath } from './workspaces'

export const githubPaths = {
  banner: (orgId: string, id: string) => `${workspacePath(orgId, id)}/github`,
  checks: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/github/checks`,
} as const

export interface PullRequest {
  number: number
  title: string
  url: string
}
export type BannerState =
  | 'none'
  | 'no-commits'
  | 'checks-running'
  | 'checks-failed'
  | 'ready-to-merge'
  | 'merged'
  | 'conflict'
  | 'changes-requested'
  | 'draft'
  | 'closed'

export type GitHubBanner = {
  branch: string
  baseBranch: string
  updatedAt: Timestamp
} & (
  | {
      state: 'none' | 'no-commits'
      pullRequest: null
      createPullRequestUrl: string | null
    }
  | {
      state: Exclude<BannerState, 'none' | 'no-commits'>
      pullRequest: PullRequest
      review: 'approved' | 'changes-requested' | 'pending' | null
      changesRequestedBy: readonly string[]
      mergedAt: Timestamp | null
      closedAt: Timestamp | null
    }
)

export interface GitHubCheck {
  id: string
  name: string
  state:
    | 'queued'
    | 'running'
    | 'passed'
    | 'failed'
    | 'cancelled'
    | 'skipped'
    | 'neutral'
    | 'action-required'
    | 'timed-out'
  url: string | null
  startedAt: Timestamp | null
  completedAt: Timestamp | null
  durationMs: number | null
}
export interface GitHubBannerResponse {
  banner: GitHubBanner
}
export interface GitHubChecksResponse {
  state: 'waiting-for-pull-request' | 'available'
  /** Preserve GitHub's order. */
  checks: readonly GitHubCheck[]
}
