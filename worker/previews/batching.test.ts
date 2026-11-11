import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { relayResponse } from './relay.test-support'
import {
  bodySource,
  holdFirstAccessRead,
  openPreview,
} from './stream-test-support'
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

it('batches queued socket frames using a new authorization read after their arrival', async () => {
  const setup = await openPreview(harness)
  expect(
    (
      await setup.handler.proxy(
        setup.previewRequest(setup.previewUrl, {
          headers: { Upgrade: 'websocket' },
        }),
      )
    ).status,
  ).toBe(101)
  const access = holdFirstAccessRead(harness)
  try {
    const upstream = harness.upstreamSockets[0]
    const browser = harness.serverSockets[0]
    const sent = browser.whenSent(3)
    upstream.emit('first')
    await access.started
    upstream.emit('second')
    upstream.emit('third')
    expect(browser.sent).toEqual([])
    access.release()
    await sent
    expect(browser.sent).toEqual(['first', 'second', 'third'])
    expect(access.reads).toBe(2)
    browser.close()
  } finally {
    access.restore()
  }
})

it('passes response data that arrives during a check in one later batch after a new read', async () => {
  const setup = await openPreview(harness)
  const source = bodySource()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) =>
    new URL(request.url).hostname === 'boat.dev'
      ? base(request)
      : relayResponse(source.stream)
  const response = await setup.handler.proxy(
    setup.previewRequest(setup.previewUrl),
  )
  const access = holdFirstAccessRead(harness)
  try {
    const reader = response.body?.getReader()
    const requested = source.nextPull()
    const first = reader?.read()
    await requested
    source.send('first')
    await access.started
    source.send('second')
    source.send('third')
    access.release()
    const text = new TextDecoder()
    expect(text.decode((await first)?.value)).toBe('first')
    expect(text.decode((await reader?.read())?.value)).toBe('secondthird')
    expect(access.reads).toBe(2)
    await reader?.cancel()
  } finally {
    access.restore()
  }
})

it('drains buffered socket data before forwarding the peer close code and reason', async () => {
  const setup = await openPreview(harness)
  for (const [index, closing] of [
    { code: 4001, reason: 'finished', forwarded: 4001, browser: false },
    { code: 1005, reason: '', forwarded: 1000, browser: true },
    { code: 1006, reason: 'connection lost', forwarded: 1011, browser: false },
  ].entries()) {
    await setup.handler.proxy(
      setup.previewRequest(setup.previewUrl, {
        headers: { Upgrade: 'websocket' },
      }),
    )
    const access = holdFirstAccessRead(harness)
    try {
      const upstream = harness.upstreamSockets[index]
      const browser = harness.serverSockets[index]
      const source = closing.browser ? browser : upstream
      const destination = closing.browser ? upstream : browser
      source.emit('final output')
      await access.started
      source.close(closing.code, closing.reason)
      destination.emit('input after peer close')
      const beforeDrain = destination.closed
      access.release()
      await destination.end
      expect(beforeDrain).toBe(null)
      expect(destination.sent).toEqual(['final output'])
      expect(destination.closed).toEqual({
        code: closing.forwarded,
        reason: closing.reason,
      })
      expect(source.sent).toEqual([])
    } finally {
      access.restore()
    }
  }
})
