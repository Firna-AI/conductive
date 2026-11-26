import type { SecretRunGrant } from '../../shared/generated/SecretRunGrant'
import { missingNames } from '../../shared/secret-late-answer'
import type { SecretRequest } from '../../shared/secret-requests'
import type { DevBackend } from './backend'
import type { OrgSecrets } from './secret-store'

// What an Allow of the dev fake does besides the change of its own request:
// the grants that its run names, and the other open requests that it
// covers, as the Worker settles them.

/**
 * The names that the grant of an Allow reaches in `sessionId`, as the
 * Worker reads them: each name of the answer in the session that asked,
 * and in another session only the values for this workspace.
 */
function reachedNames(answered: SecretRequest, sessionId: string): Set<string> {
  if (sessionId === answered.sessionId)
    return new Set(answered.secrets.map((secret) => secret.name))
  if (answered.lifetime !== 'workspace') return new Set()
  return new Set(missingNames(answered))
}

/**
 * The other open requests of the workspace that an Allow covers, as the
 * Worker settles them: the grant of the answer reaches each secret that
 * the request asks for, in the session of the request. Each covered
 * request is allowed by the member who answered, at the time of the
 * answer, oldest first.
 */
function coveredRequests(
  answered: SecretRequest,
  requests: Iterable<SecretRequest>,
): SecretRequest[] {
  return [...requests]
    .filter(
      (other) =>
        other.id !== answered.id &&
        other.workspaceId === answered.workspaceId &&
        (other.state === 'waiting' || other.state === 'late') &&
        other.secrets.every((secret) =>
          reachedNames(answered, other.sessionId).has(secret.name),
        ),
    )
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((other) => ({
      ...other,
      state: 'allowed',
      answeredBy: answered.answeredBy,
      updatedAt: answered.updatedAt,
      lifetime: missingNames(other).length > 0 ? answered.lifetime : null,
    }))
}

/** The grant that an Allow gives each name of a request, as a run names it. */
export function grantsOf(request: SecretRequest): SecretRunGrant[] {
  return request.secrets.map((secret) => {
    if (secret.secretId !== null || request.lifetime === 'save') {
      return { name: secret.name, grant: 'session' }
    }
    return {
      name: secret.name,
      grant:
        request.lifetime === 'workspace' ? 'workspace-value' : '15-minutes',
    }
  })
}

/**
 * Keeps and sends each request that an Allow covers. A covered request
 * whose call waits gets its run, as an Allow in time does. The answered
 * request sends the line of the app of its session, and the fake sends no
 * line for a covered request of another session.
 */
export function settleCovered(
  backend: DevBackend,
  store: OrgSecrets,
  answered: SecretRequest,
): void {
  for (const request of coveredRequests(answered, store.requests.values())) {
    store.requests.set(request.id, request)
    const { sessionId, workspaceId } = request
    backend.emit(workspaceId, {
      type: 'secrets.request.updated',
      sessionId,
      request,
    })
    if (request.late) continue
    backend.emit(workspaceId, {
      type: 'secrets.run',
      sessionId,
      turnId: request.turnId,
      id: request.id,
      names: request.secrets.map((secret) => secret.name),
      command: request.command,
      reason: request.reason,
      grants: grantsOf(request),
    })
  }
}
