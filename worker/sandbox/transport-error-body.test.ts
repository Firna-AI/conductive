import { expect, it } from 'vitest'

import { errorResponse, HttpError } from '../http'
import { ProviderError } from './errors'
import type { BoatClient } from './boat'
import { countedReply, paddedBody } from './transport.test-support'

const filePath = '/home/user/note.txt'

const cases = [
  {
    name: 'command error',
    request: (client: BoatClient) => client.runCommand('bx_one', 'npm test'),
    code: 'command_output_too_large',
    message: 'The command output is too large.',
    requests: 1,
  },
  {
    name: 'file error',
    request: (client: BoatClient) => client.readFile('bx_one', filePath, 3),
    code: 'sandbox_response_too_large',
    message: 'The cloud computer response is too large.',
    requests: 2,
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
    expect(reply.server.requests, scenario.name).toHaveLength(scenario.requests)
  }
})

it('cancels command and file error replies above 1 MiB without file metadata fallback', async () => {
  for (const scenario of cases) {
    const reply = countedReply(paddedBody(errorBody(), 1_048_576), {
      status: 429,
      overflow: true,
    })
    reply.server.responseFactories.push(() =>
      Response.json({
        ok: true,
        type: 'file.info',
        name: 'note.txt',
        path: filePath,
        isDir: false,
        isSymlink: false,
        size: 6_291_456,
        mode: '0644',
        modifiedAt: '2026-11-07T00:00:00Z',
      }),
    )
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
