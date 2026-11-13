import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { CODEX } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { gatewayOwnEndpoint } from './fixture.test-support'
import { gatewayHttp } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('redacts the key and secret endpoint addresses from split error bytes and allowed headers', async () => {
  const client = await gatewayHttp(
    harness,
    CODEX,
    'endpoint',
    2,
    undefined,
    {},
    { secret: 'key"with\\escape' },
  )
  try {
    client.ownEndpoint.responseFactories.push(async (request) => {
      await request.text()
      const raw = `key=${client.secret}\nbase=${gatewayOwnEndpoint}\n${JSON.stringify({ key: client.secret, endpoint: gatewayOwnEndpoint, request: request.url, host: new URL(request.url).host })}`
      const bytes = new TextEncoder().encode(raw)
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          for (let index = 0; index < bytes.length; index += 3)
            controller.enqueue(bytes.subarray(index, index + 3))
          controller.close()
        },
      })
      return new Response(body, {
        status: 400,
        headers: {
          'x-request-id': `${client.secret} ${gatewayOwnEndpoint} ${request.url}`,
        },
      })
    })
    const response = await client.request()
    expect(response.status).toBe(400)
    expect(response.headers.get('x-request-id')).toBe(
      '[redacted] [redacted] [redacted]',
    )
    expect(await response.text()).toBe(
      'key=[redacted]\nbase=[redacted]\n{"key":"[redacted]","endpoint":"[redacted]","request":"[redacted]","host":"[redacted]"}',
    )
  } finally {
    await client.dispose()
  }
})

it('redacts relative, encoded, portless and slash-escaped address echoes while keeping short query values', async () => {
  const endpoint =
    'https://proxy.example.test:8443/private/path%2Fsecret%2B123456/v1?token=query%2Fsecret%2B123456&enabled=true&version=1'
  const echoes = {
    relative:
      '/private/path%2Fsecret%2B123456/v1/responses?token=query%2Fsecret%2B123456&enabled=true&version=1',
    encoded: encodeURIComponent(endpoint),
    portless:
      'https://proxy.example.test/private/path%2Fsecret%2B123456/v1?token=query%2Fsecret%2B123456&enabled=true&version=1',
    hostname: 'proxy.example.test',
    path: 'path/secret+123456',
    encodedPath: 'path%2Fsecret%2B123456',
    query: 'query/secret+123456',
    encodedQuery: 'query%2Fsecret%2B123456',
  }
  const escaped = JSON.stringify(echoes).replaceAll('/', '\\/')
  const client = await gatewayHttp(
    harness,
    CODEX,
    'endpoint',
    2,
    async (request) => {
      await request.text()
      const bytes = new TextEncoder().encode(
        `${escaped.slice(0, -1)},"enabled":true,"short":"true","count":199}`,
      )
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
            controller.close()
          },
        }),
        {
          status: 400,
          headers: {
            'x-request-id': escaped,
            'x-ratelimit-limit': '199',
          },
        },
      )
    },
    {},
    { endpoint },
  )
  try {
    const response = await client.request()
    expect(response.status).toBe(400)
    const redacted = {
      relative: '[redacted]',
      encoded: '[redacted]',
      portless: 'https://[redacted][redacted]',
      hostname: '[redacted]',
      path: '[redacted]',
      encodedPath: '[redacted]',
      query: '[redacted]',
      encodedQuery: '[redacted]',
    }
    expect
      .soft(JSON.parse(response.headers.get('x-request-id') ?? ''))
      .toEqual(redacted)
    expect(response.headers.get('x-ratelimit-limit')).toBe('199')
    expect(await response.json()).toEqual({
      ...redacted,
      enabled: true,
      short: 'true',
      count: 199,
    })
  } finally {
    await client.dispose()
  }
})
