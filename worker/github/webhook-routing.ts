import { HttpError, isRecord } from '../http'

export interface WebhookRoute {
  repositoryId: number
  installationId: number
  branch?: string
  headSha?: string
  push: boolean
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
  if (event === 'pull_request' || event === 'pull_request_review') {
    if (
      !isRecord(value.pull_request) ||
      !isRecord(value.pull_request.head) ||
      !isRecord(value.pull_request.base)
    )
      return invalid()
    const { head, base } = value.pull_request
    if (id(head.repo) !== repositoryId || id(base.repo) !== repositoryId)
      return null
    return { ...common, branch: string(head.ref) }
  }
  const check = event === 'check_run' ? value.check_run : value.check_suite
  const headSha =
    event === 'status'
      ? string(value.sha)
      : isRecord(check)
        ? string(check.head_sha)
        : invalid()
  return { ...common, headSha }
}
