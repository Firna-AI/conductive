import type { RoutineRunTrigger } from '../../src/shared/routines'
import { HttpError, isRecord } from '../http'

export interface GitHubPullRequestEvent {
  repositoryId: number
  installationId: number
  action: string
  merged: boolean
  authorId: number
  senderId: number
  authorLogin?: string
  senderLogin?: string
  trigger: Extract<RoutineRunTrigger, { kind: 'pull-request' }>
}

export interface WebhookRoute {
  repositoryId: number
  installationId: number
  branch: string
  push: boolean
  pullRequest?: GitHubPullRequestEvent
}

/**
 * The events that refresh a workspace. Check and status events refresh none.
 * A run of checks sends many of them, and a read of every workspace of the
 * repository for each one ran into GitHub's rate limits. The timed fresh reads
 * of open tabs show check changes instead.
 */
const ROUTED_EVENTS = new Set([
  'push',
  'pull_request',
  'pull_request_review',
  'pull_request_review_thread',
])

function invalid(): never {
  throw new HttpError(
    400,
    'github_webhook_invalid',
    'The GitHub webhook is not valid.',
  )
}

function id(value: unknown): number {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0
  )
    return invalid()
  return value.id
}

function string(value: unknown): string {
  if (typeof value !== 'string' || !value) return invalid()
  return value
}

function login(value: unknown): string | undefined {
  return isRecord(value) && typeof value.login === 'string'
    ? value.login
    : undefined
}

export function webhookRoute(
  event: string,
  value: unknown,
): WebhookRoute | null {
  if (!ROUTED_EVENTS.has(event)) return null
  if (!isRecord(value)) return invalid()
  const repositoryId = id(value.repository)
  const installationId = id(value.installation)
  const common = { repositoryId, installationId, push: event === 'push' }
  if (event === 'push') {
    const ref = string(value.ref)
    return ref.startsWith('refs/heads/')
      ? { ...common, branch: ref.slice(11) }
      : null
  }
  // The rest are pull request events: they name the head branch.
  if (
    !isRecord(value.pull_request) ||
    !isRecord(value.pull_request.head) ||
    !isRecord(value.pull_request.base)
  )
    return invalid()
  const { head, base } = value.pull_request
  if (id(head.repo) !== repositoryId || id(base.repo) !== repositoryId)
    return null
  const branch = string(head.ref)
  if (event !== 'pull_request') return { ...common, branch }
  const action = string(value.action)
  const merged = value.pull_request.merged
  const kind =
    action === 'opened'
      ? 'opened'
      : action === 'synchronize'
        ? 'pushed'
        : action === 'closed' && merged === true
          ? 'merged'
          : null
  if (kind === null) return { ...common, branch }
  if (typeof merged !== 'boolean') return invalid()
  return {
    ...common,
    branch,
    pullRequest: {
      repositoryId,
      installationId,
      action,
      merged,
      authorId: id(value.pull_request.user),
      senderId: id(value.sender),
      authorLogin: login(value.pull_request.user),
      senderLogin: login(value.sender),
      trigger: {
        kind: 'pull-request',
        event: kind,
        number: id({ id: value.number }),
        url: string(value.pull_request.html_url),
        headBranch: branch,
        headSha: string(head.sha),
        baseBranch: string(base.ref),
      },
    },
  }
}
