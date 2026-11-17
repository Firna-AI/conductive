import type {
  AnswerSecretRequest,
  SecretRequest,
} from '../../src/shared/secret-requests'
import type { WorkspaceOperation } from '../chat/workspace-operation'
import { openSecretRequest, type StoredSecretRequest } from './request-records'
import { resolveSecretNames } from './run-values'
import type { SecretRuntime } from './runtime'

/**
 * The other open requests that an Allow covers, oldest first. Each names a
 * secret of the answered request, and each secret that it asked for now has
 * a grant or a temporary value for its own session. The scope of each grant
 * thus sets the reach.
 */
export async function coveredRequests(
  runtime: SecretRuntime,
  answered: StoredSecretRequest,
): Promise<StoredSecretRequest[]> {
  const { workspaceId } = answered.request
  const names = new Set(answered.request.secrets.map((secret) => secret.name))
  return runtime.chat.store.read(workspaceId, async (view) => {
    const covered: StoredSecretRequest[] = []
    for (const other of await view.secrets.requests()) {
      const { request } = other
      if (
        request.id === answered.request.id ||
        request.workspaceId !== workspaceId ||
        !openSecretRequest(request) ||
        !request.secrets.some((secret) => names.has(secret.name))
      )
        continue
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
 * The sessions where a waiting call gets the values of this answer. Their
 * agents already have the values, so they need no late notice.
 */
export function sessionsWithCall(
  answered: StoredSecretRequest,
  covered: readonly StoredSecretRequest[],
): Set<string> {
  const sessions = new Set<string>()
  for (const record of [answered, ...covered])
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
