import type { SecretGrant } from '../../shared/generated/SecretGrant'
import type { SecretRunGrant } from '../../shared/generated/SecretRunGrant'
import type {
  SecretRequest,
  SecretWorkspaceEvent,
} from '../../shared/secret-requests'
import { readSecretRequest } from '../../shared/secret-requests-read'
import {
  list,
  oneOf,
  record,
  text,
  UnreadableResponse,
  type Reader,
} from '../api/json'

/**
 * A request record of the Worker, through the shared reader of the
 * contract. A record that the reader refuses is unreadable for the chat, as
 * each other reply that does not match.
 */
export const readRequest: Reader<SecretRequest> = (value) => {
  try {
    return readSecretRequest(value)
  } catch {
    throw new UnreadableResponse('request')
  }
}

const readGrantKind = oneOf<SecretGrant>({
  'all-agents': true,
  workspace: true,
  session: true,
  '15-minutes': true,
  'workspace-value': true,
})

const readGrant: Reader<SecretRunGrant> = (value) => {
  const fields = record(value, 'grant')
  return { name: text(fields.name), grant: readGrantKind(fields.grant) }
}

/**
 * One of the three secret events of the workspace stream: the newest state
 * of a request, an allowed run, or the line of a late answer. No event holds
 * a value, an output, a duration, or an exit code.
 */
export function readSecretEvent(
  value: Record<string, unknown>,
): SecretWorkspaceEvent {
  switch (value.type) {
    case 'secrets.request.updated':
      return {
        type: value.type,
        sessionId: text(value.sessionId),
        request: readRequest(value.request),
      }
    case 'secrets.run':
      return {
        type: value.type,
        sessionId: text(value.sessionId),
        turnId: text(value.turnId),
        id: text(value.id),
        names: list(text)(value.names),
        command: text(value.command),
        reason: text(value.reason),
        grants: list(readGrant)(value.grants),
      }
    case 'secrets.notice':
      return {
        type: value.type,
        sessionId: text(value.sessionId),
        turnId: text(value.turnId),
        requestId: text(value.requestId),
        text: text(value.text),
      }
    default:
      throw new UnreadableResponse('secret event')
  }
}
