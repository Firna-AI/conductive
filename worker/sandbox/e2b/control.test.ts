import { expect, it } from 'vitest'

import { createInput, e2bFixture } from './client.test-support'
import { E2bClient } from './client'

const fixture = e2bFixture()

it('maps control failures and retry metadata without exposing unknown provider text', async () => {
  const { client, server } = fixture()
  for (const [status, kind] of [
    [400, 'invalid_request'],
    [401, 'unauthorized'],
    [402, 'payment_required'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [429, 'rate_limited'],
    [503, 'unavailable'],
  ] as const) {
    server.failure = { status, code: server.apiKey }
    const result = client.get('sandbox-one')
    await expect(result).rejects.toMatchObject({
      kind,
      status,
      providerCode: null,
      retryAfterSeconds: 3,
    })
    await expect(result).rejects.not.toThrow(server.apiKey)
  }
  server.failure = { status: 400, code: 'snapshot_filesystem_only_disabled' }
  await expect(client.get('sandbox-one')).rejects.toMatchObject({
    providerCode: 'snapshot_filesystem_only_disabled',
  })
})

it('rejects malformed identities and states without following provider destinations', async () => {
  const { client, server } = fixture()
  for (const id of [
    'sandbox-one.attacker',
    'user@attacker',
    'sandbox-one/path',
    'sandbox-one?token=secret',
  ]) {
    server.response = () =>
      Response.json({
        sandboxID: id,
        state: 'running',
        domain: 'attacker.test',
      })
    await expect(client.get('sandbox-one')).rejects.toMatchObject({
      kind: 'invalid_response',
      status: 502,
    })
  }
  server.response = () =>
    Response.json({ sandboxID: 'sandbox-one', state: 'unknown' })
  await expect(client.get('sandbox-one')).rejects.toMatchObject({
    kind: 'invalid_response',
    status: 502,
  })
  expect(
    server.requests.every(
      (request) => new URL(request.url).origin === 'https://api.eu.e2b.test',
    ),
  ).toBe(true)
})

it('bounds success and error bodies and cancels the first overflowing chunk', async () => {
  const { client, server } = fixture()
  for (const status of [200, 503]) {
    let cancelled = 0
    const bytes = new Uint8Array(1_048_576).fill(32)
    bytes.set(
      new TextEncoder().encode('{"sandboxID":"sandbox-one","state":"running"}'),
    )
    server.response = () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes)
            controller.enqueue(new Uint8Array([32]))
          },
          cancel() {
            cancelled++
          },
        }),
        { status, headers: { 'Content-Length': '1' } },
      )
    await expect(client.get('sandbox-one')).rejects.toMatchObject({
      status: 502,
      code: 'sandbox_response_too_large',
      message: 'The cloud computer response is too large.',
    })
    expect(cancelled).toBe(1)
  }
})

it('preserves ambiguous create claims after malformed success and transport body failures', async () => {
  const { client, server } = fixture()
  server.response = () => new Response('{invalid')
  await expect(client.create(createInput)).rejects.toMatchObject({
    kind: 'invalid_response',
    status: 502,
  })
  server.response = () => Response.json([])
  await expect(client.create(createInput)).rejects.toMatchObject({
    kind: 'unavailable',
    status: 503,
  })
  expect(
    server.requests.filter((request) => request.method === 'POST'),
  ).toHaveLength(1)
})

it('accepts an exact-budget control reply and preserves a malformed upstream error status', async () => {
  const { client, server } = fixture()
  const bytes = new Uint8Array(1_048_576).fill(32)
  bytes.set(
    new TextEncoder().encode('{"sandboxID":"sandbox-one","state":"running"}'),
  )
  server.response = () => new Response(bytes)
  await expect(client.get('sandbox-one')).resolves.toEqual({
    id: 'sandbox-one',
    state: 'ready',
  })
  server.response = () =>
    new Response('{invalid', { status: 503, headers: { 'Retry-After': '7' } })
  await expect(client.get('sandbox-one')).rejects.toMatchObject({
    kind: 'unavailable',
    status: 503,
    providerCode: null,
    retryAfterSeconds: 7,
  })
})

it('keeps malformed API credential text out of request construction errors', async () => {
  const { options } = fixture()
  const apiKey = 'sensitive-key\ninvalid-header'
  const result = new E2bClient({ ...options, apiKey }).get('sandbox-one')
  await expect(result).rejects.toMatchObject({
    kind: 'unavailable',
    status: 503,
  })
  await expect(result).rejects.not.toThrow(apiKey)
})
