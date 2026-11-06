import type { GitHubCheck } from '../../src/shared/github'
import { date, githubFailure, githubUrl, object, text } from './parsers'

const CONCLUSIONS = {
  SUCCESS: 'passed',
  FAILURE: 'failed',
  STARTUP_FAILURE: 'failed',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped',
  NEUTRAL: 'neutral',
  ACTION_REQUIRED: 'action-required',
  TIMED_OUT: 'timed-out',
  STALE: 'cancelled',
} as const

function checkState(
  status: unknown,
  conclusion: unknown,
): GitHubCheck['state'] {
  switch (text(status)) {
    case 'QUEUED':
    case 'REQUESTED':
    case 'WAITING':
      return 'queued'
    case 'IN_PROGRESS':
    case 'PENDING':
      return 'running'
    case 'COMPLETED': {
      const value = text(conclusion)
      if (Object.hasOwn(CONCLUSIONS, value)) {
        for (const [key, state] of Object.entries(CONCLUSIONS)) {
          if (value === key) return state
        }
      }
      throw githubFailure()
    }
    default:
      throw githubFailure()
  }
}

export function parseCheck(value: unknown, pullUrl: string): GitHubCheck {
  const check = object(value)
  if (check.__typename === 'StatusContext') {
    const status = text(check.state)
    const state =
      status === 'SUCCESS'
        ? 'passed'
        : status === 'PENDING' || status === 'EXPECTED'
          ? 'running'
          : status === 'FAILURE' || status === 'ERROR'
            ? 'failed'
            : null
    if (state === null) throw githubFailure()
    return {
      id: text(check.id),
      name: text(check.context),
      state,
      url: `${pullUrl}/checks`,
      startedAt: null,
      completedAt: state === 'running' ? null : date(check.createdAt),
      durationMs: null,
    }
  }
  if (check.__typename !== 'CheckRun') throw githubFailure()
  const state = checkState(check.status, check.conclusion)
  const startedAt = date(check.startedAt)
  const completedAt =
    state === 'queued' || state === 'running' ? null : date(check.completedAt)
  return {
    id: text(check.id),
    name: text(check.name),
    state,
    url: githubUrl(check.permalink),
    startedAt,
    completedAt,
    durationMs:
      startedAt !== null && completedAt !== null
        ? Math.max(0, completedAt - startedAt)
        : null,
  }
}

export function failedCheck(check: GitHubCheck): boolean {
  return ['failed', 'cancelled', 'action-required', 'timed-out'].includes(
    check.state,
  )
}
