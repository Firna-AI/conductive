import { afterEach, describe, expect, it, vi } from 'vitest'
import { errorResponse, HttpError } from './http'

async function answer(error: unknown) {
  const response = errorResponse(error)
  return { status: response.status, body: await response.json() }
}

const restarted = {
  status: 503,
  body: {
    error: {
      code: 'server_restarted',
      message: 'The server restarted. Try again.',
    },
  },
}

afterEach(() => vi.restoreAllMocks())

describe('errorResponse', () => {
  it('logs one unexpected_error warning with safe fields only, and none for an HttpError', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const marker = 'private_request_body'
    const request = new Request(
      `https://app.conductive.build/api/orgs/${marker}/workspaces?key=${marker}`,
    )

    errorResponse(new HttpError(409, 'workspace_archived', marker), request)
    errorResponse(new TypeError(marker), request)

    expect(warn).toHaveBeenCalledTimes(1)
    const [record] = warn.mock.calls[0] ?? []
    expect(record).toMatchObject({
      kind: 'unexpected_error',
      message: 'A request failed with an unexpected error.',
      errorName: 'TypeError',
      method: 'GET',
      route: '/api/orgs/*/workspaces',
    })
    expect(JSON.stringify(record)).not.toContain(marker)
  })

  it('keeps the JSON reply when the error throws on a read, and logs fixed fields', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = new Error('private')
    Object.defineProperty(error, 'name', {
      get() {
        throw new Error('unreadable')
      },
    })

    expect(await answer(error)).toEqual({
      status: 500,
      body: {
        error: {
          code: 'internal_error',
          message: 'The request failed. Try again.',
        },
      },
    })
    expect(warn.mock.calls).toEqual([
      [
        {
          kind: 'unexpected_error',
          message: 'A request failed with an unexpected error.',
          errorName: 'unknown',
          knownText: null,
          retryable: false,
          overloaded: false,
          durableObjectReset: false,
          method: null,
          route: null,
          frames: [],
        },
      ],
    ])
  })

  it('answers a restart of a Durable Object as a restart of the server', async () => {
    const cases = [
      new Error('Durable Object reset because its code was updated.'),
      new Error(
        "The Durable Object's code has been updated, this version can no longer access storage.",
      ),
      Object.assign(new Error('Network connection lost.'), {
        durableObjectReset: true,
      }),
    ]
    for (const error of cases) {
      expect(await answer(error), error.message).toEqual(restarted)
    }
  })

  it('keeps the general failure for another unexpected error', async () => {
    expect(await answer(new Error('Network connection lost.'))).toEqual({
      status: 500,
      body: {
        error: {
          code: 'internal_error',
          message: 'The request failed. Try again.',
        },
      },
    })
  })
})
