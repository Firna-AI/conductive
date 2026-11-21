import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { CLAUDE, CODEX } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  accounts,
  accountPath,
  modelPath,
  tokenGateway,
} from './codex-token.test-support'
import { gatewayHttp, openModelStream } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

const tooManyRequests = (
  body: string | ReadableStream<Uint8Array>,
  retryAfter?: string,
) =>
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
    const upstream = openModelStream()
    upstream.source.enqueue(
      new TextEncoder().encode(
        `{"error":"Too many requests for ${client.secret}`,
      ),
    )
    client.ownEndpoint.response = () => tooManyRequests(upstream.body, '136323')
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
    await upstream.cancelled
  } finally {
    await client.dispose()
  }
})

it('does not read a long wait from a login that the header filter removes', async () => {
  const secret = '987654321098'
  const client = await gatewayHttp(
    harness,
    CODEX,
    'endpoint',
    2,
    undefined,
    {},
    { secret },
  )
  try {
    client.ownEndpoint.response = () => tooManyRequests('{}', secret)
    const response = await client.request()
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('[redacted]')
    expect(await response.text()).toBe('{}')
  } finally {
    await client.dispose()
  }
})

it.each([
  ['an HTTP date', 'Thu, 01 Jan 1970 02:00:00 GMT', 7200],
  ['an RFC 850 date', 'Thursday, 01-Jan-70 02:00:00 GMT', 7200],
  ['an asctime date', 'Thu Jan  1 02:00:00 1970', 7200],
  ['a time after the year 9999', '9000000000000', undefined],
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
    const { error } = (await response?.json()) as {
      error: { type: string; resets_at?: number }
    }
    expect(error.type).toBe('usage_limit_reached')
    expect(error.resets_at).toBe(resetsAt)
  },
)

it.each([
  ['a date with the wrong weekday', 'Fri, 01 Jan 1970 02:00:00 GMT'],
  ['more seconds than Codex reads', '99999999999999999999'],
])('passes a ChatGPT 429 with %s unchanged', async (_name, retryAfter) => {
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
  expect(response?.headers.get('retry-after')).toBe(retryAfter)
  expect(await response?.text()).toBe('{}')
})

it('passes a long wait on the ChatGPT model list unchanged', async () => {
  const h = await tokenGateway()
  h.respond(async () => tooManyRequests('{"detail":"slow"}', '136323'))
  const response = await h.request('/backend-api/codex/models')
  expect(response?.status).toBe(429)
  expect(response?.headers.get('retry-after')).toBe('136323')
  expect(await response?.text()).toBe('{"detail":"slow"}')
})

it.each([
  ['a Codex wait of 10 minutes', CODEX, '600'],
  ['a Codex 429 without a wait', CODEX, undefined],
  ['a Codex wait that is not a number or a date', CODEX, 'soon'],
  ['a Codex wait as a date with no time', CODEX, '2030-01-01'],
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
