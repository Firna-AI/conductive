import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { createHarness, type TestHarness } from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

function messageBytes(): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({ name: 'Team', message: 'é'.repeat(499_986) }),
  )
}

function bodyStream(chunks: Uint8Array[]) {
  const observed = { pulled: 0, bytes: 0, cancelled: 0 }
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[observed.pulled]
        if (!chunk) {
          controller.close()
          return
        }
        observed.pulled++
        observed.bytes += chunk.byteLength
        controller.enqueue(chunk)
      },
      cancel() {
        observed.cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  return { body, observed }
}

it('accepts a JSON message at exactly 1 MB of UTF-8 bytes', async () => {
  const session = await harness.login()
  const bytes = messageBytes()
  expect(bytes.byteLength).toBe(1_000_000)
  const stream = bodyStream([
    bytes.subarray(0, 500_001),
    bytes.subarray(500_001),
  ])
  const init = {
    method: 'POST',
    headers: { 'Content-Length': '1000001' },
    body: stream.body,
    duplex: 'half',
  }
  const response = await harness.request(API_PATHS.orgs, session, init)
  expect(response.status).toBe(201)
  expect(await response.json()).toMatchObject({ org: { name: 'Team' } })
  expect(stream.observed).toEqual({
    pulled: 2,
    bytes: 1_000_000,
    cancelled: 0,
  })
})

it('cancels a JSON message on the first byte above 1 MB before dispatch', async () => {
  const session = await harness.login()
  const stream = bodyStream([
    messageBytes(),
    new Uint8Array([32]),
    new Uint8Array([32]),
  ])
  const init = {
    method: 'POST',
    headers: { 'Content-Length': '1' },
    body: stream.body,
    duplex: 'half',
  }
  const response = await harness.request(API_PATHS.orgs, session, init)
  expect(response.status).toBe(413)
  expect(await response.json()).toEqual({
    error: {
      code: 'body_too_large',
      message: 'The request is too large. Send less data.',
    },
  })
  expect(stream.observed).toEqual({
    pulled: 2,
    bytes: 1_000_001,
    cancelled: 1,
  })
  expect(
    await harness.env.DB.prepare('SELECT COUNT(*) AS count FROM orgs').first(
      'count',
    ),
  ).toBe(0)
})
