import type { ApiErrorBody } from '../../shared/api'
import { FAKE_ORIGIN } from '../../test-support/fixtures/core'
import type { FetchLike } from '../api/client'
import { count, items, ParseError, text, type JsonObject } from '../api/parse'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** The ID parts of route paths. A route reads each one by its name. */
export const ID = {
  org: ':org',
  workspace: ':workspace',
  section: ':section',
  repository: ':repository',
  build: ':build',
  user: ':user',
} as const

/** The IDs in a path, by name, such as `params.org` for `:org`. */
export type Params = Readonly<Record<string, string>>

interface RouteRequest {
  params: Params
  /** The query of the address, such as the search of a list or the name of an uploaded file. */
  query: URLSearchParams
  /**
   * The JSON body, or `null` when the request has none. The raw body of a
   * file upload is its bytes.
   */
  body: unknown
}

/**
 * One route of the dev fake. Its path comes from a shared path helper,
 * with an `ID` part in place of each ID. An answer of `null` sends the
 * request on to the recorded server. A promise answers later, such as an
 * upload that waits.
 */
export interface Route {
  method: Method
  path: string
  answer: (request: RouteRequest) => Response | Promise<Response> | null
}

/** A refused request. The fetch sends it as the error body of the API. */
export class RouteError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}

/** A text field that holds more than spaces, as the Worker requires. */
export function requiredText(object: JsonObject, key: string): string {
  const value = text(object, key).trim()
  if (value === '') throw new ParseError(`${key} is empty.`)
  return value
}

/** A list of numbers, such as GitHub repository IDs. */
export function numbers(object: JsonObject, key: string): number[] {
  return items(object, key, (value) => count({ value }, 'value'))
}

/** A field that a request can leave out. */
export function optional<T>(
  object: JsonObject,
  key: string,
  read: (object: JsonObject, key: string) => T,
): T | undefined {
  return object[key] === undefined ? undefined : read(object, key)
}

function segments(path: string): string[] | null {
  try {
    return path
      .split('/')
      .filter((part) => part !== '')
      .map((part) => decodeURIComponent(part))
  } catch {
    return null
  }
}

/**
 * The IDs of `path` when it matches `pattern`, or `null`. With `prefix`,
 * the path can go on after the pattern, as every path of an org does.
 */
export function match(
  pattern: string,
  path: string,
  prefix = false,
): Params | null {
  const want = segments(pattern)
  const have = segments(path)
  if (!want || !have) return null
  const sizes = prefix
    ? have.length >= want.length
    : have.length === want.length
  if (!sizes) return null
  const params: Record<string, string> = {}
  for (const [index, part] of want.entries()) {
    if (part.startsWith(':')) params[part.slice(1)] = have[index]
    else if (part !== have[index]) return null
  }
  return params
}

async function readBody(request: Request): Promise<unknown> {
  if (request.headers.get('Content-Type') === 'application/octet-stream') {
    return request.arrayBuffer()
  }
  const body = await request.text()
  if (body === '') return null
  try {
    const value: unknown = JSON.parse(body)
    return value
  } catch {
    throw new ParseError('The body is not JSON.')
  }
}

function failure(status: number, code: string, message: string): Response {
  return json({ error: { code, message } } satisfies ApiErrorBody, status)
}

/** The error body of the API for a failed route, as the Worker sends it. */
function errorResponse(error: unknown): Response {
  if (error instanceof RouteError) {
    return failure(error.status, error.code, error.message)
  }
  if (error instanceof ParseError) {
    return failure(400, 'invalid_input', 'Complete the required fields.')
  }
  return failure(500, 'internal_error', 'The request failed. Try again.')
}

/**
 * A fetch that answers from `routes`. `guard` runs first. It refuses a
 * request for an org or a workspace that the user cannot reach, and a write
 * that a suspended org refuses. A request that no route answers goes on to
 * `fallback`, the recorded server.
 */
export function routeFetch(
  routes: readonly Route[],
  guard: (path: string, method: string) => void,
  fallback: FetchLike,
): FetchLike {
  async function answer(
    input: string,
    init?: RequestInit,
  ): Promise<Response | null> {
    const request = new Request(new URL(input, FAKE_ORIGIN), init)
    const { pathname: path, searchParams: query } = new URL(request.url)
    guard(path, request.method)
    for (const route of routes) {
      if (route.method !== request.method) continue
      const params = match(route.path, path)
      if (params) {
        return route.answer({ params, query, body: await readBody(request) })
      }
    }
    return null
  }
  return async (input, init) => {
    let response: Response | null
    try {
      response = await answer(input, init)
    } catch (error) {
      return errorResponse(error)
    }
    return response ?? fallback(input, init)
  }
}
