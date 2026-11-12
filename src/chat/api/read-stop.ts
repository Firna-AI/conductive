import type { TurnStopRequester } from '../../shared/session-stop'
import { record, text } from './json'

export function readStopRequester(
  source: Record<string, unknown>,
): TurnStopRequester {
  if (source.requestedBySession !== undefined) {
    const reference = record(source.requestedBySession)
    return {
      requestedBySession: {
        workspaceId: text(reference.workspaceId),
        sessionId: text(reference.sessionId),
      },
    }
  }
  return { requestedById: text(source.requestedById) }
}
