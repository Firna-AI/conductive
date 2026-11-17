import type {
  AnswerSecretRequest,
  SecretRequest,
} from '../../src/shared/secret-requests'
import { missingNames } from '../../src/shared/secret-late-answer'
import type { WorkspaceOperation } from '../chat/workspace-operation'
import { openSecretRequest, type StoredSecretRequest } from './request-records'
import { resolveSecretNames } from './run-values'
import type { SecretRuntime } from './runtime'

/**
 * The names of the answer whose grant reaches `sessionId`. The approvals
 * and the 15-minute values of an answer reach only the session that asked.
 * Its values for this workspace reach each session of the workspace.
 */
function reachedNames(
  answered: SecretRequest,
  answer: AnswerSecretRequest,
  sessionId: string,
): Set<string> {
  if (sessionId === answered.sessionId)
    return new Set(answered.secrets.map((secret) => secret.name))
  if (answer.kind !== 'values' || answer.lifetime !== 'workspace')
    return new Set()
  return new Set(missingNames(answered))
}

/**
 * The other open requests that an Allow covers, oldest first. The grant of
 * the answer reaches each secret that the request asked for, in the session
 * of the request. The resolve then checks that each grant still holds.
 */
export async function coveredRequests(
  runtime: SecretRuntime,
  answered: StoredSecretRequest,
  answer: AnswerSecretRequest,
): Promise<StoredSecretRequest[]> {
  const { workspaceId } = answered.request
  return runtime.chat.store.read(workspaceId, async (view) => {
    const covered: StoredSecretRequest[] = []
    for (const other of await view.secrets.requests()) {
      const { request } = other
      if (
        request.id === answered.request.id ||
        request.workspaceId !== workspaceId ||
        !openSecretRequest(request)
      )
        continue
      const reached = reachedNames(answered.request, answer, request.sessionId)
      if (!request.secrets.every((secret) => reached.has(secret.name))) continue
      const resolved = await resolveSecretNames(
        runtime,
        view,
        other.orgId,
        workspaceId,
        request.sessionId,
        request.secrets.map((secret) => secret.name),
      )
      if (resolved.every((item) => item.temporary || item.secret?.grant))
        covered.push(other)
    }
    return covered.sort(
      (a, b) =>
        a.request.createdAt - b.request.createdAt ||
        a.request.id.localeCompare(b.request.id),
    )
  })
}

/**
 * The sessions where the waiting call of a covered request gets the values
 * of this answer. Their agents already have the values, so they need no
 * late notice. The caller adds the session of the answered request itself.
 */
export function sessionsWithCall(
  covered: readonly StoredSecretRequest[],
): Set<string> {
  const sessions = new Set<string>()
  for (const record of covered)
    if (record.request.state === 'waiting')
      sessions.add(record.request.sessionId)
  return sessions
}

/**
 * Allows each covered request with the answer of `answered`. One answer
 * sends at most one late notice for each session, and none to a session
 * where a waiting call gets the values. `noticed` holds the sessions that
 * need no more notice. Returns the requests whose notice started a turn.
 */
export async function allowCoveredRequests(
  runtime: SecretRuntime,
  operation: WorkspaceOperation,
  answered: SecretRequest,
  answer: AnswerSecretRequest,
  covered: readonly StoredSecretRequest[],
  noticed: Set<string>,
): Promise<StoredSecretRequest[]> {
  const sent: StoredSecretRequest[] = []
  const values = answer.kind === 'values' ? Object.values(answer.values) : []
  for (let record of covered) {
    const { sessionId } = record.request
    const lateAnswer =
      record.request.state === 'late' && !noticed.has(sessionId)
    noticed.add(sessionId)
    const asksValue = record.request.secrets.some(
      (secret) => secret.secretId === null,
    )
    record = {
      ...record,
      lateAnswer,
      request: {
        ...record.request,
        state: 'allowed',
        answeredBy: answered.answeredBy,
        updatedAt: answered.updatedAt,
        lifetime:
          asksValue && answer.kind === 'values' ? answer.lifetime : null,
      },
    }
    await operation.change(async (view) => {
      const filter = await runtime.filter(
        view,
        { id: record.request.workspaceId, orgId: record.orgId },
        values,
      )
      record.request = {
        ...record.request,
        command: filter(record.request.command),
        reason: filter(record.request.reason),
      }
      await runtime.save(view, record)
    })
    if (lateAnswer) {
      record.request.notice = await runtime.chat.secretNotice(record)
      if (record.request.notice.state === 'sent') sent.push(record)
    }
    await runtime.publish(operation, record)
  }
  return sent
}
