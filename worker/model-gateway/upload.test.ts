import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { MACHINE_ORIGIN } from '../chat/harness.test-support'
import {
  streamedBody,
  streamedRequest,
  oversizedError,
} from '../http/request-body.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  deferred,
  gatewayHttp,
  gatewayPath,
  openModelStream,
} from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('streams exactly 100,000,000 upload bytes to the upstream without trusting Content-Length', async () => {
  const client = await gatewayHttp(harness)
  const chunk = new Uint8Array(1_000_000)
  const source = streamedBody(Array.from({ length: 100 }, () => chunk))
  let upstreamBytes = 0
  let firstPullSourceCount = 0
  client.anthropic.responseFactories.push(async (request) => {
    if (!request.body) throw new Error('The upstream upload is missing.')
    for await (const value of request.body) {
      if (upstreamBytes === 0) firstPullSourceCount = source.observed.pulled
      upstreamBytes += value.byteLength
    }
    return new Response('accepted')
  })
  try {
    const response = await client.fetch(
      streamedRequest(
        `${MACHINE_ORIGIN}${gatewayPath('claude')}`,
        source.body,
        {
          'x-api-key': client.token,
          'Content-Length': '1',
        },
      ),
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('accepted')
    expect(upstreamBytes).toBe(100_000_000)
    expect(firstPullSourceCount).toBe(1)
    expect(source.observed).toEqual({
      pulled: 100,
      bytes: 100_000_000,
      cancelled: 0,
    })
  } finally {
    await client.dispose()
  }
})

it('returns the shared 413 and cancels the upstream even when its answer arrives before upload overflow', async () => {
  const client = await gatewayHttp(harness)
  const early = deferred<void>()
  const release = deferred<void>()
  const answer = openModelStream()
  const observed = { pulls: 0, cancelled: 0 }
  const body = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        observed.pulls++
        if (observed.pulls === 1)
          controller.enqueue(new Uint8Array(100_000_000))
        else {
          await release.promise
          controller.enqueue(new Uint8Array(1))
        }
      },
      cancel() {
        observed.cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  client.anthropic.responseFactories.push(async (request) => {
    const reader = request.body?.getReader()
    await reader?.read()
    reader?.releaseLock()
    early.resolve()
    return new Response(answer.body)
  })
  let settled = false
  const response = client
    .fetch(
      streamedRequest(`${MACHINE_ORIGIN}${gatewayPath('claude')}`, body, {
        'x-api-key': client.token,
        'Content-Length': '1',
      }),
    )
    .then((response) => {
      settled = true
      return response
    })
  try {
    const state = await Promise.race([
      early.promise.then(() => 'upstream answered'),
      response.then(() => 'gateway answered'),
    ])
    expect(state).toBe('upstream answered')
    expect(settled).toBe(false)
    release.resolve()
    const rejected = await response
    expect(rejected.status).toBe(413)
    expect(await rejected.json()).toEqual(oversizedError)
    expect(client.anthropic.requests[0].signal.aborted).toBe(true)
    await answer.cancelled
    expect(observed).toEqual({ pulls: 2, cancelled: 1 })
    expect(client.anthropic.requests).toHaveLength(1)
  } finally {
    release.resolve()
    await client.dispose()
  }
})
