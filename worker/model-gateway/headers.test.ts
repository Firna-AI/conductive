import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { gatewayHttp } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('forwards only allowed request and response headers and removes echoed login values', async () => {
  const client = await gatewayHttp(harness)
  try {
    client.anthropic.response = () =>
      new Response('unchanged success', {
        headers: {
          'content-type': 'text/event-stream',
          'retry-after': '1',
          'x-should-retry': 'true',
          'anthropic-ratelimit-tokens-remaining': '100',
          'request-id': `before-${client.secret}-after`,
          'x-request-id': 'openai-id',
          'x-ratelimit-remaining-requests': '4',
          'x-ratelimit-reset-tokens': '3s',
          'set-cookie': 'provider-session=private',
          location: 'https://elsewhere.test',
          authorization: client.secret,
          'x-secret': client.secret,
          'cf-ray': 'private',
        },
      })
    const response = await client.request(undefined, {
      headers: {
        accept: 'text/event-stream',
        'accept-encoding': 'gzip',
        'content-language': 'en',
        'anthropic-version': '2023-06-01',
        'anthropic-future-capability': 'pass',
        'x-claude-code-future': 'pass',
        'x-stainless-runtime': 'node',
        'x-app': 'cli',
        'user-agent': 'pinned-program',
        authorization: 'Bearer remove-this',
        'proxy-authorization': 'remove-this',
        cookie: 'private=remove',
        'cf-ray': 'remove',
        'x-forwarded-for': 'remove',
        'x-conductive-workspace-token': 'remove',
        'conductive-internal': 'remove',
        'x-unlisted': 'remove',
        connection: 'x-app',
      },
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('unchanged success')
    const sent = client.anthropic.requests[0]
    expect(Object.fromEntries(sent.headers)).toEqual({
      accept: 'text/event-stream',
      'accept-encoding': 'gzip',
      'content-type': 'application/json',
      'content-language': 'en',
      'anthropic-version': '2023-06-01',
      'anthropic-future-capability': 'pass',
      'x-claude-code-future': 'pass',
      'x-stainless-runtime': 'node',
      'user-agent': 'pinned-program',
      'x-api-key': client.secret,
    })
    expect(Object.fromEntries(response.headers)).toEqual({
      'content-type': 'text/event-stream',
      'retry-after': '1',
      'x-should-retry': 'true',
      'anthropic-ratelimit-tokens-remaining': '100',
      'request-id': 'before-[redacted]-after',
      'x-request-id': 'openai-id',
      'x-ratelimit-remaining-requests': '4',
      'x-ratelimit-reset-tokens': '3s',
    })
  } finally {
    await client.dispose()
  }
})

it('redacts a login split across upstream error chunks and preserves status and other bytes', async () => {
  const client = await gatewayHttp(harness)
  try {
    const encoder = new TextEncoder()
    const raw = encoder.encode(
      `{"error":{"message":"é💡 ${client.secret} then ${client.secret}"}}`,
    )
    client.anthropic.response = () =>
      new Response(
        new ReadableStream({
          start(controller) {
            for (const value of raw) controller.enqueue(Uint8Array.of(value))
            controller.close()
          },
        }),
        {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': '2' },
        },
      )
    const response = await client.request()
    expect(response.status).toBe(429)
    expect(await response.text()).toBe(
      '{"error":{"message":"é💡 [redacted] then [redacted]"}}',
    )
    expect(response.headers.get('retry-after')).toBe('2')
  } finally {
    await client.dispose()
  }
})

it('returns a safe provider error on a failed fetch without retrying or following a redirect', async () => {
  const client = await gatewayHttp(harness)
  try {
    client.anthropic.responseFactories.push(async () => {
      throw new Error(`Private detail ${client.secret}`)
    })
    const failed = await client.request()
    expect(failed.status).toBe(502)
    expect(await failed.json()).toEqual({
      type: 'error',
      error: {
        type: 'api_error',
        code: 'model_upstream_unavailable',
        message: 'The model service is not available. Try again.',
      },
    })
    expect(client.anthropic.requests).toHaveLength(1)
    client.anthropic.response = () =>
      new Response('Moved', {
        status: 307,
        headers: { Location: 'https://elsewhere.test' },
      })
    const redirect = await client.request()
    expect(redirect.status).toBe(307)
    expect(redirect.headers.has('location')).toBe(false)
    expect(await redirect.text()).toBe('Moved')
    expect(client.anthropic.requests).toHaveLength(2)
  } finally {
    await client.dispose()
  }
})
