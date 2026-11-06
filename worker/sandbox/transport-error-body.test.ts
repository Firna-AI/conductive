import { expect, it } from 'vitest'

import { errorResponse, HttpError } from '../http'
import { ProviderError } from './errors'
import type { BoatClient } from './boat'
import { countedReply, paddedBody } from './transport.test-support'

const cases = [
  {
    name: 'command error',
    request: (client: BoatClient) => client.runCommand('bx_one', 'npm test'),
    code: 'command_output_too_large',
    message: 'The command output is too large.',
  },
  {
    name: 'file error',
    request: (client: BoatClient) =>
      client.readFile('bx_one', '/home/user/note.txt', 3),
    code: 'sandbox_response_too_large',
    message: 'The cloud computer response is too large.',
  },
]

function errorBody() {
  return {
    ok: false,
    code: 'provider_code',
    message: 'private boat-first credential',
  }
}

it('maps command and file error replies at exactly 1 MiB without leaking provider text', async () => {
  for (const scenario of cases) {
    const reply = countedReply(paddedBody(errorBody(), 1_048_576), {
      status: 429,
    })
    const error: unknown = await scenario
      .request(reply.client)
      .catch((error: unknown) => error)
    expect(error, scenario.name).toBeInstanceOf(ProviderError)
    expect(error, scenario.name).toMatchObject({
      kind: 'rate_limited',
      status: 429,
      providerCode: 'provider_code',
      retryAfterSeconds: 3,
      message: 'The sandbox provider request failed: rate_limited',
    })
    expect(reply.observed, scenario.name).toEqual({
      pulled: 2,
      bytes: 1_048_576,
      cancelled: 0,
    })
    expect(reply.server.requests, scenario.name).toHaveLength(1)
  }
})

it('cancels command and file error replies above 1 MiB without file metadata fallback', async () => {
  for (const scenario of cases) {
    const reply = countedReply(paddedBody(errorBody(), 1_048_576), {
      status: 429,
      overflow: true,
    })
    const error: unknown = await scenario
      .request(reply.client)
      .catch((error: unknown) => error)
    expect(error, scenario.name).toBeInstanceOf(HttpError)
    const response = errorResponse(error)
    expect(response.status, scenario.name).toBe(502)
    expect(await response.json(), scenario.name).toEqual({
      error: { code: scenario.code, message: scenario.message },
    })
    expect(reply.observed, scenario.name).toEqual({
      pulled: 2,
      bytes: 1_048_577,
      cancelled: 1,
    })
    expect(reply.server.requests, scenario.name).toHaveLength(1)
  }
})
