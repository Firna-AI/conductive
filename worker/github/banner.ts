import type { GitHubBanner, GitHubCheck } from '../../src/shared/github'
import { HttpError } from '../http'
import { failedCheck } from './checks'
import type { GitHubWorkspace } from './contracts'
import {
  choice,
  date,
  flag,
  githubFailure,
  githubUrl,
  integer,
  object,
  text,
} from './parsers'

export interface GitHubPull {
  number: number
  title: string
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  draft: boolean
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
  mergeState:
    | 'BEHIND'
    | 'BLOCKED'
    | 'CLEAN'
    | 'DIRTY'
    | 'DRAFT'
    | 'HAS_HOOKS'
    | 'UNKNOWN'
    | 'UNSTABLE'
  baseBranch: string
  headSha: string
  review: 'approved' | 'changes-requested' | 'pending' | null
  mergedAt: number | null
  closedAt: number | null
}

export function parsePull(
  value: unknown,
  workspace: GitHubWorkspace,
): GitHubPull {
  const pull = object(value)
  if (
    integer(object(pull.headRepository).databaseId) !==
      workspace.repositoryId ||
    text(pull.headRefName) !== workspace.branch
  )
    throw githubFailure()
  const review =
    pull.reviewDecision === null
      ? null
      : pull.reviewDecision === 'APPROVED'
        ? 'approved'
        : pull.reviewDecision === 'CHANGES_REQUESTED'
          ? 'changes-requested'
          : pull.reviewDecision === 'REVIEW_REQUIRED'
            ? 'pending'
            : undefined
  const url = githubUrl(pull.url)
  if (review === undefined || url === null) throw githubFailure()
  return {
    number: integer(pull.number),
    title: text(pull.title),
    url,
    state: choice(pull.state, ['OPEN', 'CLOSED', 'MERGED']),
    draft: flag(pull.isDraft),
    mergeable: choice(pull.mergeable, ['MERGEABLE', 'CONFLICTING', 'UNKNOWN']),
    mergeState: choice(pull.mergeStateStatus, [
      'BEHIND',
      'BLOCKED',
      'CLEAN',
      'DIRTY',
      'DRAFT',
      'HAS_HOOKS',
      'UNKNOWN',
      'UNSTABLE',
    ]),
    baseBranch: text(pull.baseRefName),
    headSha: text(pull.headRefOid),
    review,
    mergedAt: date(pull.mergedAt),
    closedAt: date(pull.closedAt),
  }
}

export function pullBanner(
  workspace: GitHubWorkspace,
  pull: GitHubPull,
  checks: readonly GitHubCheck[],
  changesRequestedBy: readonly string[],
  now: number,
): GitHubBanner {
  const common = {
    branch: workspace.branch,
    baseBranch: pull.baseBranch,
    updatedAt: now,
    pullRequest: {
      number: pull.number,
      title: pull.title,
      url: pull.url,
      headSha: pull.headSha,
    },
    review: pull.review,
    changesRequestedBy,
    mergedAt: pull.mergedAt,
    closedAt: pull.closedAt,
  }
  if (pull.state === 'MERGED') return { ...common, state: 'merged' }
  if (pull.state === 'CLOSED') return { ...common, state: 'closed' }
  if (pull.state !== 'OPEN') throw githubFailure()
  if (pull.draft) return { ...common, state: 'draft' }
  if (pull.mergeable === 'CONFLICTING') return { ...common, state: 'conflict' }
  if (pull.review === 'changes-requested')
    return { ...common, state: 'changes-requested' }
  if (checks.some(failedCheck)) return { ...common, state: 'checks-failed' }
  if (
    checks.some(
      (check) => check.state === 'running' || check.state === 'queued',
    )
  ) {
    return { ...common, state: 'checks-running' }
  }
  if (pull.mergeState === 'BEHIND' || pull.mergeState === 'BLOCKED')
    return { ...common, state: 'blocked' }
  if (
    pull.mergeable !== 'MERGEABLE' ||
    !['CLEAN', 'HAS_HOOKS'].includes(pull.mergeState)
  ) {
    throw new HttpError(
      503,
      'github_pending',
      'GitHub is updating this pull request. Try again.',
    )
  }
  return { ...common, state: 'ready-to-merge' }
}
