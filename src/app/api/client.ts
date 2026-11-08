import { ParseError, record, text } from './parse'

/** The fetch that the client uses: the browser's, or a fake in development. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** A failed request, with the error code of the API when it sent one. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface ApiClient {
  /**
   * The fetch of this client, with its origin and its credentials. A
   * feature client that reads its own replies, such as the file routes,
   * sends through it, so the web app and the Mac app keep their transport.
   */
  readonly fetch: FetchLike
  get<T>(path: string, read: (body: unknown) => T): Promise<T>
  /** A write. The app gate needs a JSON body, so an empty write sends `{}`. */
  send<T>(
    method: WriteMethod,
    path: string,
    body: object,
    read: (body: unknown) => T,
  ): Promise<T>
}

const offline = new ApiError(
  0,
  'network',
  "The app can't reach the server. Check the connection, then try again.",
)

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return null
  try {
    const body: unknown = await response.json()
    return body
  } catch {
    return null
  }
}

function errorFrom(status: number, body: unknown): ApiError {
  try {
    const error = record(record(body).error, 'error')
    return new ApiError(status, text(error, 'code'), text(error, 'message'))
  } catch {
    return new ApiError(status, 'http_error', 'The request failed. Try again.')
  }
}

/** The JSON client of the browser API. It sends the session cookie. */
export function createApiClient(fetch: FetchLike): ApiClient {
  async function request<T>(
    path: string,
    init: RequestInit,
    read: (body: unknown) => T,
  ): Promise<T> {
    let response: Response
    try {
      response = await fetch(path, { credentials: 'same-origin', ...init })
    } catch {
      throw offline
    }
    const body = await readJson(response)
    if (!response.ok) throw errorFrom(response.status, body)
    try {
      return read(body)
    } catch (error) {
      if (!(error instanceof ParseError)) throw error
      throw new ApiError(
        response.status,
        'invalid_response',
        'The app could not read the answer of the server. Try again.',
      )
    }
  }
  return {
    fetch,
    get: (path, read) =>
      request(
        path,
        { method: 'GET', headers: { Accept: 'application/json' } },
        read,
      ),
    send: (method, path, body, read) =>
      request(
        path,
        {
          method,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
        read,
      ),
  }
}

/** The product message of an error, for a notice or a toast. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Try again.'
}
