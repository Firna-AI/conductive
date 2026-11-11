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

export function privateResponse(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  if (!response.headers.has('Referrer-Policy'))
    response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  return response
}
