import type { MessageSender } from './generated/MessageSender'
import type {
  SecretRequest,
  SecretRequestsResponse,
  SecretRequestResponse,
  WorkspaceSecretValue,
  RequestedSecret,
  SecretValueLifetime,
  SecretRequestEnd,
  SecretNoticeFailure,
} from './secret-requests'

function invalid(): never {
  throw new Error('Invalid secret request record.')
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return invalid()
  return Object.fromEntries(Object.entries(value))
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : invalid()
}
function nullableText(value: unknown) {
  return value === null ? null : text(value)
}
function number(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? value
    : invalid()
}
function array<T>(value: unknown, read: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(read) : invalid()
}
function member(value: unknown): MessageSender {
  const item = object(value)
  return {
    id: text(item.id),
    githubLogin: text(item.githubLogin),
    displayName: nullableText(item.displayName),
    avatarUrl: nullableText(item.avatarUrl),
  }
}
function lifetime(value: unknown): SecretValueLifetime | null {
  return value === null ||
    value === '15-minutes' ||
    value === 'workspace' ||
    value === 'save'
    ? value
    : invalid()
}
function end(value: unknown): SecretRequestEnd | null {
  return value === null ||
    value === 'archived' ||
    value === 'org-suspended' ||
    value === 'owner-suspended' ||
    value === 'session-closed'
    ? value
    : invalid()
}
function failure(value: unknown): SecretNoticeFailure {
  return value === 'login-not-shared' ||
    value === 'login-unavailable' ||
    value === 'sender-unavailable'
    ? value
    : invalid()
}
function notice(value: unknown): SecretRequest['notice'] {
  if (value === null) return null
  const item = object(value)
  if (item.state === 'sent') return { state: 'sent', turnId: text(item.turnId) }
  if (item.state === 'not-sent')
    return { state: 'not-sent', reason: failure(item.reason) }
  return invalid()
}
function requested(value: unknown): RequestedSecret {
  const item = object(value)
  return {
    name: text(item.name),
    description: text(item.description),
    secretId: nullableText(item.secretId),
  }
}

export function readSecretRequest(value: unknown): SecretRequest {
  const item = object(value)
  if (
    item.state !== 'waiting' &&
    item.state !== 'late' &&
    item.state !== 'allowed' &&
    item.state !== 'denied' &&
    item.state !== 'not-answered'
  )
    return invalid()
  if (typeof item.late !== 'boolean') return invalid()
  return {
    id: text(item.id),
    workspaceId: text(item.workspaceId),
    sessionId: text(item.sessionId),
    turnId: text(item.turnId),
    sender: member(item.sender),
    secrets: array(item.secrets, requested),
    reason: text(item.reason),
    command: text(item.command),
    state: item.state,
    late: item.late,
    createdAt: number(item.createdAt),
    updatedAt: number(item.updatedAt),
    answeredBy: item.answeredBy === null ? null : member(item.answeredBy),
    lifetime: lifetime(item.lifetime),
    endedBy: end(item.endedBy),
    notice: notice(item.notice),
  }
}

export function readWorkspaceSecretValue(value: unknown): WorkspaceSecretValue {
  const item = object(value)
  return {
    id: text(item.id),
    name: text(item.name),
    suppliedBy: member(item.suppliedBy),
    createdAt: number(item.createdAt),
  }
}

export function readSecretRequestsResponse(
  value: unknown,
): SecretRequestsResponse {
  const item = object(value)
  return {
    requests: array(item.requests, readSecretRequest),
    workspaceValues: array(item.workspaceValues, readWorkspaceSecretValue),
  }
}

export function readSecretRequestResponse(
  value: unknown,
): SecretRequestResponse {
  return { request: readSecretRequest(object(value).request) }
}
