import type {
  BannerState,
  GitHubBanner,
  GitHubBannerResponse,
  GitHubCheck,
  GitHubChecksResponse,
  PullRequest,
} from '../shared/github'

type PullRequestState = Exclude<BannerState, 'none' | 'no-commits'>
type CheckState = GitHubCheck['state']
type Review = Extract<GitHubBanner, { pullRequest: PullRequest }>['review']

/** The records make the compiler list every state of the contract. */
const pullRequestStates: Readonly<Record<PullRequestState, true>> = {
  'checks-running': true,
  'checks-failed': true,
  'ready-to-merge': true,
  merged: true,
  conflict: true,
  'changes-requested': true,
  draft: true,
  closed: true,
  blocked: true,
}

const checkStates: Readonly<Record<CheckState, true>> = {
  queued: true,
  running: true,
  passed: true,
  failed: true,
  cancelled: true,
  skipped: true,
  neutral: true,
  'action-required': true,
  'timed-out': true,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPullRequestState(value: unknown): value is PullRequestState {
  return typeof value === 'string' && Object.hasOwn(pullRequestStates, value)
}

function isCheckState(value: unknown): value is CheckState {
  return typeof value === 'string' && Object.hasOwn(checkStates, value)
}

function isReview(value: unknown): value is Review {
  return (
    value === null ||
    value === 'approved' ||
    value === 'changes-requested' ||
    value === 'pending'
  )
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isNumber(value)
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function readPullRequest(value: unknown): PullRequest | null {
  if (
    !isRecord(value) ||
    !isNumber(value.number) ||
    typeof value.title !== 'string' ||
    typeof value.url !== 'string' ||
    typeof value.headSha !== 'string'
  )
    return null
  return {
    number: value.number,
    title: value.title,
    url: value.url,
    headSha: value.headSha,
  }
}

function readBanner(value: unknown): GitHubBanner | null {
  if (
    !isRecord(value) ||
    typeof value.branch !== 'string' ||
    typeof value.baseBranch !== 'string' ||
    !isNumber(value.updatedAt)
  )
    return null
  const branch = {
    branch: value.branch,
    baseBranch: value.baseBranch,
    updatedAt: value.updatedAt,
  }
  const state = value.state
  if (state === 'none' || state === 'no-commits') {
    if (value.pullRequest !== null) return null
    if (!isStringOrNull(value.createPullRequestUrl)) return null
    return {
      ...branch,
      state,
      pullRequest: null,
      createPullRequestUrl: value.createPullRequestUrl,
    }
  }
  const pullRequest = readPullRequest(value.pullRequest)
  if (
    !isPullRequestState(state) ||
    !pullRequest ||
    !isReview(value.review) ||
    !isStringList(value.changesRequestedBy) ||
    !isNumberOrNull(value.mergedAt) ||
    !isNumberOrNull(value.closedAt)
  )
    return null
  return {
    ...branch,
    state,
    pullRequest,
    review: value.review,
    changesRequestedBy: value.changesRequestedBy,
    mergedAt: value.mergedAt,
    closedAt: value.closedAt,
  }
}

function readCheck(value: unknown): GitHubCheck | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !isCheckState(value.state) ||
    !isStringOrNull(value.url) ||
    !isNumberOrNull(value.startedAt) ||
    !isNumberOrNull(value.completedAt) ||
    !isNumberOrNull(value.durationMs)
  )
    return null
  return {
    id: value.id,
    name: value.name,
    state: value.state,
    url: value.url,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    durationMs: value.durationMs,
  }
}

/** Narrows a banner reply. A reply outside the contract gives null. */
export function readBannerResponse(body: unknown): GitHubBannerResponse | null {
  if (!isRecord(body)) return null
  const banner = readBanner(body.banner)
  return banner ? { banner } : null
}

/** Narrows a checks reply, and keeps GitHub's order of the checks. */
export function readChecksResponse(body: unknown): GitHubChecksResponse | null {
  if (!isRecord(body) || !Array.isArray(body.checks)) return null
  const state = body.state
  if (state !== 'waiting-for-pull-request' && state !== 'available') return null
  const items: readonly unknown[] = body.checks
  const checks: GitHubCheck[] = []
  for (const item of items) {
    const check = readCheck(item)
    if (!check) return null
    checks.push(check)
  }
  return { state, checks }
}

/** The text of an API error reply, which the Worker writes for users. */
export function readErrorMessage(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body.error)) return null
  const message = body.error.message
  return typeof message === 'string' && message.trim() !== '' ? message : null
}
