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
    'key"with\\escape',
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
