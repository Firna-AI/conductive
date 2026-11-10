import { conductorImportOperationsPath } from '../../shared/conductor-import'
import type {
  ImportOperationRequest,
  ImportPublicEvent,
} from '../../shared/conductor-import-operation'
import { readImportPublicEvent } from '../../shared/conductor-import-public-read'
import type { FetchLike } from '../api/client'
import { readLines } from './ndjson'

/** A failure of the Mac that the operation names. */
type ImportFailure = Extract<ImportPublicEvent, { kind: 'failed' }>

/**
 * How an operation ended: `done` after its last event, a failure that the
 * Mac named, an error of the server or of the connection, or a stop of the
 * page. Only `done` ends a complete operation.
 */
export type ImportOperationEnd =
  | { kind: 'done' }
  | ImportFailure
  | { kind: 'error'; code: string; message: string }
  | { kind: 'aborted' }

const unreachable = {
  kind: 'error',
  code: 'network',
  message:
    "The app can't reach the server. Check the connection, then try again.",
} as const

const unreadable = {
  kind: 'error',
  code: 'invalid_response',
  message: 'The app could not read the answer of the server. Try again.',
} as const

/** The connection to the Mac ended before the operation did. */
const disconnected = {
  kind: 'error',
  code: 'disconnected',
  message: 'The connection to this Mac ended. Try again.',
} as const

/** The error of a refused start, as the API names it in its JSON body. */
async function refusal(response: Response): Promise<ImportOperationEnd> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const { error } = body
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string' &&
        'message' in error &&
        typeof error.message === 'string'
      ) {
        return { kind: 'error', code: error.code, message: error.message }
      }
    }
  } catch {
    // An answer with no readable error names the failure in general words.
  }
  return {
    kind: 'error',
    code: 'http_error',
    message: 'The import failed. Try again.',
  }
}

/**
 * Runs one import operation of this Mac through the Worker, with the exact
 * pairing of the connection of this window. It reads the answer one line
 * at a time and gives each public event to `onEvent` as it comes. The
 * operation ends only with `done`, a failure, an error, or the end of the
 * connection: `complete` names a workspace, and its result pages follow
 * it. `signal` stops the operation, such as when the page leaves, and the
 * Worker then stops the work on the Mac. Nothing here starts it again.
 */
export async function runImportOperation(
  fetch: FetchLike,
  orgId: string,
  request: ImportOperationRequest,
  onEvent: (event: ImportPublicEvent) => void,
  signal: AbortSignal,
): Promise<ImportOperationEnd> {
  let response: Response
  try {
    response = await fetch(conductorImportOperationsPath(orgId), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/x-ndjson',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    })
  } catch {
    return signal.aborted ? { kind: 'aborted' } : unreachable
  }
  if (!response.ok) return refusal(response)
  const { body } = response
  if (!body) return unreadable
  let end: ImportOperationEnd | null = null
  try {
    for await (const line of readLines(body)) {
      end = eventEnd(line, onEvent)
      if (end) break
    }
  } catch {
    end = null
  }
  // The reader let go of the body, so the cancel closes the connection.
  void body.cancel().catch(() => undefined)
  return end ?? (signal.aborted ? { kind: 'aborted' } : disconnected)
}

/**
 * Reads one line: the end of the operation, or null after `onEvent` took
 * an event that does not end it. A line that the app cannot read ends it.
 */
function eventEnd(
  line: string,
  onEvent: (event: ImportPublicEvent) => void,
): ImportOperationEnd | null {
  let event: ImportPublicEvent
  try {
    event = readImportPublicEvent(JSON.parse(line))
  } catch {
    return unreadable
  }
  switch (event.kind) {
    case 'done':
      return { kind: 'done' }
    case 'failed':
      return event
    case 'error':
      return { kind: 'error', code: event.code, message: event.message }
    default:
      onEvent(event)
      return null
  }
}
