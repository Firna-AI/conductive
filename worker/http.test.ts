import { describe, expect, it } from 'vitest'
import { errorResponse } from './http'

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

describe('errorResponse', () => {
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
