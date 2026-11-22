import type { ApiErrorBody } from '../src/shared/api'
import {
  unexpectedErrorFields,
  unreadableErrorFields,
  type UnexpectedErrorFields,
} from './unexpected-error'
import { warnWorker } from './warnings'

export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: ApiErrorBody['error']['details']
  readonly retryAt?: number

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorBody['error']['details'],
    retryAt?: number,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.retryAt = retryAt
  }
}

/**
 * Cloudflare marks an error of a Durable Object that restarted, such as for
 * a deploy, with `durableObjectReset`. An old object that a deploy replaced
 * can still run a request, and its storage calls fail with a text that
 * names the code update.
 */
const CODE_UPDATED = /Durable Object\b.*\bcode (?:was|has been) updated/i

function objectRestarted(error: unknown): boolean {
  try {
    if (!isRecord(error)) return false
    if (error.durableObjectReset === true) return true
    return error instanceof Error && CODE_UPDATED.test(error.message)
  } catch {
    return false
  }
}

/** The log never changes the reply, also when the error throws on a read. */
function warnUnexpected(error: unknown, request?: Request): void {
  let fields: UnexpectedErrorFields
  try {
    fields = unexpectedErrorFields(error, request)
  } catch {
    fields = unreadableErrorFields
  }
  warnWorker({ kind: 'unexpected_error', ...fields })
}

/**
 * Writes the `unexpected_error` warning for an error that is not an
 * `HttpError`, also when no reply can carry it, as after a handshake.
 */
export function warnUnexpectedError(error: unknown, request?: Request): void {
  if (!(error instanceof HttpError)) warnUnexpected(error, request)
}

/**
 * The API error body of an error. An error that is not an `HttpError` also
 * writes the `unexpected_error` warning, with the route of `request` when
 * the caller gives it.
 */
export function errorResponse(error: unknown, request?: Request): Response {
  warnUnexpectedError(error, request)
  if (objectRestarted(error)) {
    return Response.json(
      {
        error: {
          code: 'server_restarted',
          message: 'The server restarted. Try again.',
        },
      } satisfies ApiErrorBody,
      { status: 503 },
    )
  }
  if (error instanceof HttpError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          retryAt: error.retryAt,
        },
      } satisfies ApiErrorBody,
      { status: error.status },
    )
  }
  return Response.json(
    {
      error: {
        code: 'internal_error',
        message: 'The request failed. Try again.',
      },
    } satisfies ApiErrorBody,
    { status: 500 },
  )
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function requiredString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'invalid_input', 'Complete the required fields.')
  }
  return value.trim()
}

function securityHeaders(response: Response): Response {
  if (!response.headers.has('Referrer-Policy'))
    response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  return response
}

export function privateResponse(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  return securityHeaders(response)
}

/**
 * A preview reply keeps the cache rules that the preview code set.
 * A reply without rules gets `no-store`. A bare 304 keeps the rules of the reply that the browser stored.
 */
export function previewResponse(response: Response): Response {
  if (!response.headers.has('Cache-Control') && response.status !== 304)
    response.headers.set('Cache-Control', 'no-store')
  return securityHeaders(response)
}
