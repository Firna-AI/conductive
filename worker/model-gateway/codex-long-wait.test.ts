import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { CLAUDE, CODEX } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  accounts,
  accountPath,
  modelPath,
  tokenGateway,
} from './codex-token.test-support'
import { gatewayHttp } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

const tooManyRequests = (body: string, retryAfter?: string) =>
  new Response(body, {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'upstream-request',
      'x-should-retry': 'true',
      ...(retryAfter === undefined ? {} : { 'retry-after': retryAfter }),
    },
  })

it('ends the Codex turn of an own endpoint on a 429 with a long wait, without the login', async () => {
  const client = await gatewayHttp(harness, CODEX, 'endpoint', 2)
  try {
    client.ownEndpoint.response = () =>
      tooManyRequests(
        `{"error":{"message":"Too many requests for ${client.secret}"}}`,
        '136323',
      )
    const response = await client.request()
    expect(response.status).toBe(429)
    expect(Object.fromEntries(response.headers)).toEqual({
      'content-type': 'application/json',
      'x-request-id': 'upstream-request',
    })
    expect(await response.json()).toEqual({
      error: {
        type: 'usage_limit_reached',
        code: 'model_rate_limited',
        param: null,
        message:
          'The model service limits this login until 2027-01-16T21:52:03.000Z. Try again then.',
        resets_at: 1_800_136_323,
      },
    })
    expect(client.ownEndpoint.requests).toHaveLength(1)
  } finally {
    await client.dispose()
  }
})

it.each([
  ['a far HTTP date', 'Thu, 01 Jan 1970 02:00:00 GMT', 7200],
  ['more seconds than a date holds', '99999999999999999999', 8_640_000_000_000],
])(
  'ends the Codex turn of a ChatGPT sign-in on a 429 that waits until %s',
  async (_name, retryAfter, resetsAt) => {
    const h = await tokenGateway()
    h.respond(async (request) =>
      new URL(request.url).pathname === accountPath
        ? Response.json(accounts())
        : tooManyRequests('{}', retryAfter),
    )
    const response = await h.request(modelPath, {
      method: 'POST',
      body: '{"input":[]}',
    })
    expect(response?.status).toBe(429)
    expect(response?.headers.has('retry-after')).toBe(false)
    expect(await response?.json()).toMatchObject({
      error: { type: 'usage_limit_reached', resets_at: resetsAt },
    })
  },
)

it.each([
  ['a Codex wait of 10 minutes', CODEX, '600'],
  ['a Codex 429 without a wait', CODEX, undefined],
  ['a Codex wait that is not a number or a date', CODEX, 'soon'],
  ['a Claude wait of hours', CLAUDE, '136323'],
] as const)('passes %s unchanged', async (_name, choice, retryAfter) => {
  const client = await gatewayHttp(harness, choice, 'endpoint', 2)
  try {
    const body = '{"error":{"type":"rate_limit_error"}}'
    client.ownEndpoint.response = () => tooManyRequests(body, retryAfter)
    const response = await client.request()
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe(retryAfter ?? null)
    expect(await response.text()).toBe(body)
  } finally {
    await client.dispose()
  }
})
