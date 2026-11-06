/** The app's fetch, or the fake API's fetch in development and tests. */
export type ApiFetch = (input: string, init?: RequestInit) => Promise<Response>

/** A failed request, with a message that the tool can show to the user. */
export interface ToolError {
  code: string
  message: string
}

export type ToolResult<T> =
  { ok: true; value: T } | { ok: false; error: ToolError }

export interface ToolRequest {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  /** A write always sends a JSON object, also an empty one, as the gate needs. */
  body?: object
  signal?: AbortSignal
  /** `no-store` skips the browser cache, for an answer that must be new. */
  cache?: RequestCache
}

const requestFailed: ToolError = {
  code: 'request_failed',
  message: 'The request failed. Try again.',
}

const networkFailed: ToolError = {
  code: 'network_error',
  message: 'Check your connection, then try again.',
}

const unreadable: ToolError = {
  code: 'invalid_response',
  message: 'The request failed. Try again.',
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A web address that a frame or a link can open, or null for anything else. */
export function webUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const { protocol } = new URL(value)
    return protocol === 'https:' || protocol === 'http:' ? value : null
  } catch {
    return null
  }
}

function errorBody(value: unknown): ToolError | null {
  if (!isRecord(value) || !isRecord(value.error)) return null
  const { code, message } = value.error
  if (typeof code !== 'string' || typeof message !== 'string') return null
  return { code, message }
}

/** The JSON body of a response, null for an empty body, or undefined. */
async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text === '') return null
  try {
    const value: unknown = JSON.parse(text)
    return value
  } catch {
    return undefined
  }
}

/**
 * Sends one API request, and narrows its JSON body with `parse`. A body that
 * `parse` refuses becomes an `invalid_response` error, so a tool can show an
 * error state in place of broken data.
 */
export async function requestJson<T>(
  fetch: ApiFetch,
  request: ToolRequest,
  parse: (body: unknown) => T | null,
): Promise<ToolResult<T>> {
  const init: RequestInit = {
    method: request.method,
    signal: request.signal,
    cache: request.cache,
  }
  if (request.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(request.body)
  }
  let response: Response
  try {
    response = await fetch(request.path, init)
  } catch {
    return { ok: false, error: networkFailed }
  }
  const body = await readBody(response).catch(() => undefined)
  if (!response.ok) {
    return { ok: false, error: errorBody(body) ?? requestFailed }
  }
  const value = body === undefined ? null : parse(body)
  return value === null ? { ok: false, error: unreadable } : { ok: true, value }
}
