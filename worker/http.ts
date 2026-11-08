import type { ApiErrorBody } from '../src/shared/api'

export class HttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      {
        error: { code: error.code, message: error.message },
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
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  return response
}
