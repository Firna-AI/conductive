import type { RoutineRunTrigger } from '../../src/shared/routines'
import { HttpError, isRecord } from '../http'

export interface GitHubPullRequestEvent {
  repositoryId: number
  installationId: number
  action: string
  merged: boolean
  authorId: number
  senderId: number
  trigger: Extract<RoutineRunTrigger, { kind: 'pull-request' }>
}

export interface WebhookRoute {
  repositoryId: number
  installationId: number
  branch?: string
  push: boolean
  pullRequest?: GitHubPullRequestEvent
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

export function webhookRoute(
  event: string,
  value: unknown,
): WebhookRoute | null {
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
  const repositoryId = id(value.repository)
  const installationId = id(value.installation)
  const common = { repositoryId, installationId, push: event === 'push' }
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
  // Validate the commit field. A status can refer to a test merge commit.
  // The workspace always reads its current display state for these events.
  if (event === 'status') string(value.sha)
  else if (isRecord(check)) string(check.head_sha)
  else invalid()
  return common
}
