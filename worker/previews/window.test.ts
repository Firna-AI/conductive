import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { previewPath } from '../../src/shared/previews'
import { TEST_TIME } from '../test-support/harness'
import { PREVIEW_ACCESS_WINDOW_MS } from './authorization'
import { relayResponse } from './relay.test-support'
import { bodySource, openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
  harness.dependencies.previewAccessWindowMs = PREVIEW_ACCESS_WINDOW_MS
})
afterAll(async () => {
  await harness.dispose()
})

/** Counts the access reads of previews and their viewers. */
function countAccessReads(target: ToolsHarness) {
  const database = target.env.DB
  let reads = 0
  target.env.DB = new Proxy(database, {
    get(db, name) {
      if (name !== 'prepare') return Reflect.get(db, name)
      return (query: string) => {
        if (query.includes('WITH requested')) reads++
        return db.prepare(query)
      }
    },
  })
  return {
    get reads() {
      return reads
    },
    restore: () => {
      target.env.DB = database
    },
  }
}

function relayWith(source: ReturnType<typeof bodySource> | null) {
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) =>
    new URL(request.url).hostname === 'boat.dev'
      ? base(request)
      : relayResponse(source?.stream ?? 'page')
}

it('checks a request with one access read, and reuses it within the window', async () => {
  const setup = await openPreview(harness)
  const source = bodySource()
  relayWith(source)
  const counter = countAccessReads(harness)
  try {
    const streamed = await setup.handler.proxy(setup.previewRequest())
    expect(streamed.status).toBe(200)
    expect(counter.reads).toBe(1)
    const reader = streamed.body?.getReader()
    const first = reader?.read()
    source.send('first')
    expect(new TextDecoder().decode((await first)?.value)).toBe('first')
    relayWith(null)
    expect((await setup.handler.proxy(setup.previewRequest())).status).toBe(200)
    expect(counter.reads).toBe(1)
    harness.setNow(TEST_TIME + PREVIEW_ACCESS_WINDOW_MS)
    const later = reader?.read()
    source.send('after the window')
    expect(new TextDecoder().decode((await later)?.value)).toBe(
      'after the window',
    )
    expect(counter.reads).toBe(2)
    await reader?.cancel()
  } finally {
    counter.restore()
  }
})

it('refuses a signed-out viewer once the window ends', async () => {
  const setup = await openPreview(harness)
  relayWith(null)
  expect((await setup.handler.proxy(setup.previewRequest())).status).toBe(200)
  const signOut = await harness.request(API_PATHS.signOut, setup.session, {
    method: 'POST',
    body: '{}',
  })
  expect(signOut.status).toBe(204)
  // Risk in force: a request inside the window still passes.
  expect((await setup.handler.proxy(setup.previewRequest())).status).toBe(200)
  harness.setNow(TEST_TIME + PREVIEW_ACCESS_WINDOW_MS)
  expect((await setup.handler.proxy(setup.previewRequest())).status).toBe(404)
})

it('ends access at once when the preview closes, also inside the window', async () => {
  const setup = await openPreview(harness)
  const source = bodySource()
  relayWith(source)
  const streamed = await setup.handler.proxy(setup.previewRequest())
  expect(streamed.status).toBe(200)
  const close = await setup.handler.fetch(
    setup.request(
      previewPath(setup.orgId, setup.workspaceId, setup.preview.id),
      { method: 'DELETE', body: '{}' },
    ),
  )
  expect(close.status).toBe(204)
  expect(source.cancelled).toBe(true)
  expect((await setup.handler.proxy(setup.previewRequest())).status).toBe(404)
})
