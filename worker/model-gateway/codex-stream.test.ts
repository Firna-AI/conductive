import { createHash } from 'node:crypto'

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { CODEX, MACHINE_ORIGIN } from '../chat/harness.test-support'
import {
  oversizedError,
  streamedBody,
  streamedRequest,
} from '../http/request-body.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { refusedModelRequest } from './codex-body.test-support'
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

it('streams a 100,000,000-byte Codex object unchanged and withholds its last byte until EOF', async () => {
  const client = await gatewayHttp(harness, CODEX)
  const first = new Uint8Array(1_000_000).fill(97)
  first.set(new TextEncoder().encode('{"input":"'))
  const middle = new Uint8Array(1_000_000).fill(97)
  const last = new Uint8Array(1_000_000).fill(97)
  last.set(new TextEncoder().encode('"}'), last.length - 2)
  const chunks = [first, ...Array.from({ length: 98 }, () => middle), last]
  const expected = createHash('sha256')
  for (const chunk of chunks) expected.update(chunk)
  const observed = { pulls: 0, eof: false }
  const source = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[observed.pulls++]
        if (chunk) controller.enqueue(chunk)
        else {
          observed.eof = true
          controller.close()
        }
      },
    },
    { highWaterMark: 0 },
  )
  const received = createHash('sha256')
  let bytes = 0
  let beforeEof = 0
  let firstPulls = 0
  let largestChunk = 0
  client.openai.responseFactories.push(async (request) => {
    if (!request.body) throw new Error('The upstream upload is missing.')
    for await (const chunk of request.body) {
      if (bytes === 0) firstPulls = observed.pulls
      bytes += chunk.byteLength
      if (!observed.eof) beforeEof = bytes
      largestChunk = Math.max(largestChunk, chunk.byteLength)
      received.update(chunk)
    }
    return new Response('accepted')
  })
  try {
    const response = await client.fetch(
      streamedRequest(`${MACHINE_ORIGIN}${gatewayPath('codex')}`, source, {
        Authorization: `Bearer ${client.token}`,
        'Content-Length': '1',
      }),
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('accepted')
    expect(bytes).toBe(100_000_000)
    expect(received.digest('hex')).toBe(expected.digest('hex'))
    expect(firstPulls).toBe(1)
    expect(largestChunk).toBeLessThanOrEqual(1_000_000)
    expect(beforeEof).toBe(99_999_999)
    expect(observed).toEqual({ pulls: 101, eof: true })
  } finally {
    await client.dispose()
  }
})

it('validates the remaining Codex upload and cancels an early upstream answer on refusal', async () => {
  const client = await gatewayHttp(harness, CODEX)
  const early = deferred<void>()
  const release = deferred<void>()
  const answer = openModelStream()
  let cancelled = 0
  let pulls = 0
  const source = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        if (++pulls === 1)
          controller.enqueue(new TextEncoder().encode('{"input":1,'))
        else {
          await release.promise
          controller.enqueue(new TextEncoder().encode('"background":true}'))
          controller.close()
        }
      },
      cancel() {
        cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  client.openai.responseFactories.push(async (request) => {
    const reader = request.body?.getReader()
    await reader?.read()
    await reader?.cancel()
    early.resolve()
    return new Response(answer.body)
  })
  const pending = client.fetch(
    streamedRequest(`${MACHINE_ORIGIN}${gatewayPath('codex')}`, source, {
      Authorization: `Bearer ${client.token}`,
    }),
  )
  try {
    await early.promise
    release.resolve()
    const response = await pending
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(refusedModelRequest)
    await answer.cancelled
    expect(client.openai.requests[0].signal.aborted).toBe(true)
    expect(cancelled).toBe(0)
  } finally {
    release.resolve()
    await client.dispose()
  }
})

it('keeps the shared 413 for a Codex upload above 100,000,000 bytes', async () => {
  const client = await gatewayHttp(harness, CODEX)
  const chunk = new Uint8Array(1_000_000).fill(32)
  const first = chunk.slice()
  first[0] = 123
  const source = streamedBody([
    first,
    ...Array.from({ length: 99 }, () => chunk),
    Uint8Array.of(125),
  ])
  try {
    const response = await client.fetch(
      streamedRequest(`${MACHINE_ORIGIN}${gatewayPath('codex')}`, source.body, {
        Authorization: `Bearer ${client.token}`,
      }),
    )
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual(oversizedError)
    expect(client.openai.requests[0].signal.aborted).toBe(true)
    expect(source.observed.cancelled).toBe(1)
  } finally {
    await client.dispose()
  }
})
