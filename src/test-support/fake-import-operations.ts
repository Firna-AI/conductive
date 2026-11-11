import type { FetchLike } from '../app/api/client'
import type {
  ImportOperationRequest,
  ImportPublicEvent,
} from '../shared/conductor-import-operation'
import { readImportAction } from '../shared/conductor-import-operation-read'

/** The events of one operation as the Worker sends them: one JSON line each. */
function ndjsonReply(events: readonly ImportPublicEvent[]): Response {
  return new Response(
    events.map((event) => `${JSON.stringify(event)}\n`).join(''),
    { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } },
  )
}

/**
 * A fetch of the operation route that records each request and answers it
 * with the events that `answer` gives for it, as NDJSON lines.
 */
export function operationFetch(
  answer: (request: ImportOperationRequest) => readonly ImportPublicEvent[],
): { fetch: FetchLike; requests: ImportOperationRequest[] } {
  const requests: ImportOperationRequest[] = []
  const fetch: FetchLike = async (_input, init) => {
    const body: unknown = JSON.parse(String(init?.body))
    const pairing =
      typeof body === 'object' && body !== null ? body : { deviceId: null }
    const request: ImportOperationRequest = {
      deviceId: 'deviceId' in pairing ? String(pairing.deviceId) : '',
      connectionId:
        'connectionId' in pairing ? String(pairing.connectionId) : '',
      ...readImportAction(body),
    }
    requests.push(request)
    return ndjsonReply(answer(request))
  }
  return { fetch, requests }
}
