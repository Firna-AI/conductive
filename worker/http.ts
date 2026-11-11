import type { ApiErrorBody } from '../src/shared/api'

export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: ApiErrorBody['error']['details']

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorBody['error']['details'],
  ) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
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
