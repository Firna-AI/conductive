import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { deferred, gatewayHttp, openModelStream } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('passes success bytes in steps before the upstream finishes and preserves them without redaction', async () => {
  const client = await gatewayHttp(harness)
  const upstream = openModelStream()
  client.anthropic.response = () =>
    new Response(upstream.body, {
      headers: { 'content-type': 'text/event-stream' },
    })
  try {
    const response = await client.request()
    expect(response.status).toBe(200)
    const reader = response.body?.getReader()
    if (!reader) throw new Error('The response stream is missing.')
    const first = new TextEncoder().encode(`data: ${client.secret}\n\n`)
    upstream.source.enqueue(first)
    const received = await reader.read()
    expect(received).toEqual({ done: false, value: first })
    expect(received.value).toBe(first)
    const second = new Uint8Array([0, 255, 0, 128])
    upstream.source.enqueue(second)
    expect(await reader.read()).toEqual({ done: false, value: second })
    upstream.source.close()
    expect(await reader.read()).toEqual({ done: true, value: undefined })
    const checks = client.checks.length
    await client.fixture.clock.advance(60_000)
    expect(client.checks).toHaveLength(checks)
    expect(client.anthropic.requests).toHaveLength(1)
  } finally {
    await client.dispose()
  }
})

it('checks an open answer every 30 seconds and ends it after its real turn ends', async () => {
  const client = await gatewayHttp(harness)
  const upstream = openModelStream()
  client.anthropic.response = () => new Response(upstream.body)
  try {
    const response = await client.request()
    expect(response.status).toBe(200)
    const reader = response.body?.getReader()
    if (!reader) throw new Error('The response stream is missing.')
    await client.fixture.clock.advance(29_999)
    expect(client.checks).toHaveLength(1)
    await client.fixture.clock.advance(1)
    expect(client.checks).toHaveLength(2)
    await client.finish()
    let ended = false
    const pending = reader.read().finally(() => {
      ended = true
    })
    const refusal = expect(pending).rejects.toThrow('The model turn ended.')
    await client.fixture.clock.advance(29_999)
    expect(ended).toBe(false)
    await client.fixture.clock.advance(1)
    await refusal
    await upstream.cancelled
    expect(client.checks).toHaveLength(3)
    expect(client.anthropic.requests[0].signal.aborted).toBe(true)
    await client.fixture.clock.advance(60_000)
    expect(client.checks).toHaveLength(3)
  } finally {
    await client.dispose()
  }
})

it('cancels the upstream on response cancellation or a disconnect before response headers', async () => {
  const client = await gatewayHttp(harness)
  const upstream = openModelStream()
  client.anthropic.response = () => new Response(upstream.body)
  try {
    const response = await client.request()
    expect(response.status).toBe(200)
    await response.body?.cancel('client closed')
    await upstream.cancelled
    expect(client.anthropic.requests[0].signal.aborted).toBe(true)
    const checks = client.checks.length
    await client.fixture.clock.advance(30_000)
    expect(client.checks).toHaveLength(checks)

    const entered = deferred<void>()
    client.anthropic.responseFactories.push(
      (request) =>
        new Promise((_resolve, reject) => {
          entered.resolve()
          request.signal.addEventListener(
            'abort',
            () => reject(request.signal.reason),
            { once: true },
          )
        }),
    )
    const controller = new AbortController()
    const pending = client.request(undefined, { signal: controller.signal })
    const state = await Promise.race([
      entered.promise.then(() => 'upstream entered'),
      pending.then(() => 'gateway answered'),
    ])
    expect(state).toBe('upstream entered')
    controller.abort('client closed')
    const cancelled = await pending
    expect(cancelled.status).toBe(502)
    expect(client.anthropic.requests[1].signal.aborted).toBe(true)
    expect(client.anthropic.requests).toHaveLength(2)
  } finally {
    await client.dispose()
  }
})
