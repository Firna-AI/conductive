import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { relayResponse } from './relay.test-support'
import { openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
})
afterAll(async () => {
  await harness.dispose()
})

it("keeps the server's cache rules for the viewer's browser only", async () => {
  const setup = await openPreview(harness)
  const base = harness.dependencies.fetch
  const date = 'Tue, 10 Nov 2026 12:00:00 GMT'
  const expires = 'Wed, 11 Nov 2026 12:00:00 GMT'
  for (const { status, upstream, expected } of [
    {
      status: 200,
      upstream: { 'Cache-Control': 'max-age=31536000,immutable' },
      expected: { 'Cache-Control': 'private, max-age=31536000,immutable' },
    },
    {
      status: 200,
      upstream: { 'Cache-Control': 'public, max-age=600' },
      expected: { 'Cache-Control': 'private, public, max-age=600' },
    },
    {
      status: 200,
      upstream: {
        'Cache-Control': 'private="Set-Cookie, Authorization", no-store',
      },
      expected: {
        'Cache-Control':
          'private, no-cache, private="Set-Cookie, Authorization", no-store',
      },
    },
    {
      status: 200,
      upstream: { 'Cache-Control': 'max-age=abc' },
      expected: { 'Cache-Control': 'private, no-cache, max-age=abc' },
    },
    {
      status: 200,
      upstream: { 'Cache-Control': 'max-age=60', Age: '120', Date: date },
      expected: {
        'Cache-Control': 'private, max-age=60',
        Age: '120',
        Date: date,
      },
    },
    {
      status: 200,
      upstream: { Expires: expires },
      expected: { 'Cache-Control': 'private', Expires: expires },
    },
    {
      status: 200,
      upstream: {},
      expected: { 'Cache-Control': 'private, no-cache' },
    },
    { status: 304, upstream: {}, expected: { 'Cache-Control': null } },
  ]) {
    harness.dependencies.fetch = async (request) =>
      new URL(request.url).hostname === 'boat.dev'
        ? base(request)
        : relayResponse(status === 304 ? null : 'preview content', {
            status,
            headers: upstream,
          })
    const response = await setup.handler.proxy(
      setup.previewRequest(setup.previewUrl),
    )
    const sent = Object.fromEntries(
      Object.keys(expected).map((name) => [name, response.headers.get(name)]),
    )
    expect({ status, upstream, sent }).toEqual({
      status,
      upstream,
      sent: expected,
    })
  }
})
