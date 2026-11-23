import type { AutomationRunTrigger } from '../../src/shared/automations'
import { HttpError, isRecord } from '../http'
import { object } from './parsers'
import type { ReachedRepository } from './repository-reach'
import {
  parseGitHubStackMembership,
  type GitHubStackMembership,
} from './stack-parsers'

export interface GitHubPullRequestEvent {
  repositoryId: number
  installationId: number
  action: string
  merged: boolean
  authorId: number
  senderId: number
  authorLogin?: string
  senderLogin?: string
  /** The GitHub merge time of a merged pull request, when the event has one. */
  mergedAt?: number
  trigger: Extract<AutomationRunTrigger, { kind: 'pull-request' }>
}

export interface WebhookRoute extends ReachedRepository {
  branch?: string
  /** The branches that a check event names. Empty when it names none. */
  branches?: string[]
  push: boolean
  pullRequest?: GitHubPullRequestEvent
  pullRequestChange?: {
    number: number
    stack?: GitHubStackMembership | null
    baseChange?: { from: string; fromSha: string; to: string; toSha: string }
  }
}

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

function pullRequestChange(
  value: Record<string, unknown>,
  action: string,
  base: Record<string, unknown>,
): WebhookRoute['pullRequestChange'] {
  const changedBase =
    action === 'edited' && isRecord(value.changes)
      ? value.changes.base
      : undefined
  if (value.stack === undefined && changedBase === undefined) return undefined
  const change: NonNullable<WebhookRoute['pullRequestChange']> = {
    number: id({ id: value.number }),
  }
  try {
    if (value.stack !== undefined)
      change.stack =
        value.stack === null ? null : parseGitHubStackMembership(value.stack)
    if (changedBase !== undefined) {
      const previous = object(changedBase)
      change.baseChange = {
        from: string(object(previous.ref).from),
        fromSha: string(object(previous.sha).from),
        to: string(base.ref),
        toSha: string(base.sha),
      }
    }
  } catch {
    return invalid()
  }
  return change
}

/** A merge time that does not parse leaves the time to the caller. */
function mergeTime(kind: string, value: unknown): { mergedAt?: number } {
  if (kind !== 'merged' || typeof value !== 'string') return {}
  const time = Date.parse(value)
  return Number.isSafeInteger(time) ? { mergedAt: time } : {}
}

export function webhookRepository(
  event: string,
  value: unknown,
): ReachedRepository | null {
  if (
    ![
      'push',
      'pull_request',
      'pull_request_review',
      'pull_request_review_thread',
      'check_run',
      'check_suite',
      'status',
    ].includes(event)
  ) {
    return null
  }
  if (!isRecord(value)) return invalid()
  return {
    repositoryId: id(value.repository),
    installationId: id(value.installation),
  }
}

export function webhookRoute(
  event: string,
  value: unknown,
): WebhookRoute | null {
  const repository = webhookRepository(event, value)
  if (repository === null) return null
  if (!isRecord(value)) return invalid()
  const { repositoryId, installationId } = repository
  const common = { ...repository, push: event === 'push' }
  if (event === 'push') {
    const ref = string(value.ref)
    return ref.startsWith('refs/heads/')
      ? { ...common, branch: ref.slice(11) }
      : null
  }
  if (
    event === 'pull_request' ||
    event === 'pull_request_review' ||
    event === 'pull_request_review_thread'
  ) {
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
    const change = pullRequestChange(value, action, base)
    const target = {
      ...common,
      branch,
      ...(change && { pullRequestChange: change }),
    }
    const merged = value.pull_request.merged
    const kind =
      action === 'opened'
        ? 'opened'
        : action === 'synchronize'
          ? 'pushed'
          : action === 'closed' && merged === true
            ? 'merged'
            : null
    if (kind === null) return target
    if (typeof merged !== 'boolean') return invalid()
    return {
      ...target,
      pullRequest: {
        repositoryId,
        installationId,
        action,
        merged,
        authorId: id(value.pull_request.user),
        senderId: id(value.sender),
        authorLogin: login(value.pull_request.user),
        senderLogin: login(value.sender),
        ...mergeTime(kind, value.pull_request.merged_at),
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
  const check = event === 'check_run' ? value.check_run : value.check_suite
  // Validate the commit field. A status can refer to a test merge commit,
  // which names no branch. Such an event reaches each open pull request.
  if (event === 'status') {
    string(value.sha)
    return { ...common, branches: statusBranches(value.branches) }
  }
  if (!isRecord(check)) return invalid()
  string(check.head_sha)
  const suite = event === 'check_run' ? check.check_suite : check
  const branch = isRecord(suite) ? suite.head_branch : undefined
  return {
    ...common,
    branches: typeof branch === 'string' && branch ? [branch] : [],
  }
}

function statusBranches(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) =>
    isRecord(item) && typeof item.name === 'string' && item.name
      ? [item.name]
      : [],
  )
}
