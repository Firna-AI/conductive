import { afterAll, beforeAll, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { DESKTOP_EXCHANGE_PATH, DESKTOP_ORIGIN } from './desktop-contract'
import { desktopHandoff } from './desktop-http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('stops the public exchange at its byte budget before sign-in and accepts an exact-budget JSON handoff', async () => {
  let pulls = 0
  let cancellations = 0
  const chunk = new TextEncoder().encode(' '.repeat(64_000))
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pulls += 1
        controller.enqueue(chunk)
        if (pulls === 100) controller.close()
      },
      cancel() {
        cancellations += 1
      },
    },
    { highWaterMark: 0 },
  )
  const init = {
    method: 'POST',
    headers: { Origin: DESKTOP_ORIGIN, 'Content-Type': 'application/json' },
    body,
    duplex: 'half',
  }
  const refused = await harness.fetch(DESKTOP_EXCHANGE_PATH, init)
  expect(refused.status).toBe(413)
  expect(await refused.json()).toEqual({
    error: {
      code: 'body_too_large',
      message: 'The request body is too large.',
    },
  })
  expect(refused.headers.get('Access-Control-Allow-Origin')).toBe(
    DESKTOP_ORIGIN,
  )
  expect(refused.headers.get('Set-Cookie')).toBeNull()
  expect(pulls).toBe(16)
  expect(pulls * chunk.byteLength).toBe(1_024_000)
  expect(cancellations).toBe(1)
  expect(body.locked).toBe(false)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM sessions',
    ).first('count'),
  ).toBe(0)

  const verifier = 'v'.repeat(43)
  const callback = await desktopHandoff(harness, verifier)
  const token = new URLSearchParams(
    new URL(callback.headers.get('Location') ?? '').hash.slice(1),
  ).get('token')
  const completed = await harness.fetch(DESKTOP_EXCHANGE_PATH, {
    method: 'POST',
    headers: {
      Origin: DESKTOP_ORIGIN,
      'Content-Type': ' Application/JSON ; charset=utf-8',
    },
    body: JSON.stringify({ token, verifier }).padEnd(1_000_000, ' '),
  })
  expect(completed.status).toBe(204)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM sessions',
    ).first('count'),
  ).toBe(1)
})
