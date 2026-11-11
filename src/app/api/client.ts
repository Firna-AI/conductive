import type { ApiErrorBody } from '../../shared/api'
import { choice, count, ParseError, record, text } from './parse'

/** The fetch that the client uses: the browser's, or a fake in development. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** What a refusal names beside its message, such as a login that a save refused. */
export type ApiErrorDetails = NonNullable<ApiErrorBody['error']['details']>

/** A failed request, with the error code of the API when it sent one. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetails | null

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorDetails | null = null,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/** One raw file for an upload route, as a `FileTransport` sends it. */
interface FileRequest {
  /** The path of the route, with the query that names the file. */
  path: string
  file: File
  /** Gets the number of bytes of the file that the browser sent so far. */
  progress: (sentBytes: number) => void
  /** Stops the request, such as after Remove or a change of person. */
  signal: AbortSignal
}

/** The status of an answer to a file, and its JSON body, or `null`. */
export interface FileReply {
  status: number
  body: unknown
}

/**
 * Sends one raw file with the session cookie, from the address that the
 * client's fetch uses. It rejects when no answer came, such as offline, or
 * when `signal` stopped the request.
 */
export type FileTransport = (request: FileRequest) => Promise<FileReply>

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
  /**
   * Sends one raw file, as the upload routes take it, through the file
   * transport of the client. Its answer and its errors read as a write's.
   */
  sendFile<T>(
    path: string,
    file: File,
    read: (body: unknown) => T,
    hooks: Pick<FileRequest, 'progress' | 'signal'>,
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

/**
 * The details of a refusal. A refusal without them, or with details that
 * the app cannot read, still shows its message.
 */
function readDetails(value: unknown): ApiErrorDetails | null {
  if (value === undefined || value === null) return null
  try {
    const details = record(value, 'details')
    return {
      login: text(details, 'login'),
      triggerIndex: count(details, 'triggerIndex'),
      list: choice(details, 'list', ['is', 'isNot']),
    }
  } catch {
    return null
  }
}

function errorFrom(status: number, body: unknown): ApiError {
  try {
    const error = record(record(body).error, 'error')
    return new ApiError(
      status,
      text(error, 'code'),
      text(error, 'message'),
      readDetails(error.details),
    )
  } catch {
    return new ApiError(status, 'http_error', 'The request failed. Try again.')
  }
}

/** The value of an answer, or its error, as the API says it. */
function answer<T>(
  status: number,
  body: unknown,
  read: (body: unknown) => T,
): T {
  if (status < 200 || status > 299) throw errorFrom(status, body)
  try {
    return read(body)
  } catch (error) {
    if (!(error instanceof ParseError)) throw error
    throw new ApiError(
      status,
      'invalid_response',
      'The app could not read the answer of the server. Try again.',
    )
  }
}

/**
 * The JSON client of the browser API. It sends the session cookie. `files`
 * sends the raw files of uploads, so that the browser can measure them.
 */
export function createApiClient(
  fetch: FetchLike,
  files?: FileTransport,
): ApiClient {
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
    return answer(response.status, await readJson(response), read)
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
    sendFile: async (path, file, read, hooks) => {
      if (!files) throw new Error('This client has no file transport.')
      let reply: FileReply
      try {
        reply = await files({ path, file, ...hooks })
      } catch {
        throw offline
      }
      return answer(reply.status, reply.body, read)
    },
  }
}

/** The product message of an error, for a notice or a toast. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Try again.'
}
