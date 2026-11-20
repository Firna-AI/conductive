import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  PREVIEW_FILES_MARK_HEADER,
  PREVIEW_RELAY_PORT_HEADER,
} from '../../src/shared/previews'
import { createPreviewHandler } from './handler'
import { filesPreviewBrowser, filesPreviewSetup } from './files-test-support'
import { relayResponse } from './relay.test-support'
import { bodySource, openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(() => harness.resetTools())
afterAll(() => harness.dispose())

it('sends files requests to port 7683 with its own files mark and local origin', async () => {
  const setup = await filesPreviewSetup(harness)
  const opened = await setup.open()
  expect(opened.status).toBe(201)
  const browser = await filesPreviewBrowser(setup, opened)
  harness.requests.length = 0
  const response = await setup.handler.proxy(
    browser.request(`${browser.previewUrl}/reports/page.html?raw=1`, {
      headers: {
        [PREVIEW_FILES_MARK_HEADER]: 'browser-value',
        Origin: browser.previewUrl,
      },
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('preview content')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(response.headers.get(PREVIEW_FILES_MARK_HEADER)).toBeNull()
  expect(harness.requests.map((request) => request.url)).toEqual([
    'https://sandbox-7682.on.boat.dev/reports/page.html?raw=1',
  ])
  const upstream = harness.requests[0]
  expect(upstream.headers.get(PREVIEW_RELAY_PORT_HEADER)).toBe('7683')
  expect(upstream.headers.get(PREVIEW_FILES_MARK_HEADER)).toBe('1')
  expect(upstream.headers.get('Origin')).toBe('http://localhost:7683')
  expect(upstream.headers.get('Cookie')).toBe('_port_auth=server-port-token')
})

it('never sends the browser files mark through a port preview of the file server', async () => {
  const setup = await openPreview(harness, 7683)
  harness.requests.length = 0
  for (const mark of [undefined, '1']) {
    const headers = new Headers()
    if (mark) headers.set(PREVIEW_FILES_MARK_HEADER, mark)
    const response = await setup.handler.proxy(
      setup.previewRequest(undefined, { headers }),
    )
    expect(response.status).toBe(200)
    await response.text()
  }
  expect(harness.requests).toHaveLength(2)
  for (const request of harness.requests) {
    expect(request.headers.get(PREVIEW_RELAY_PORT_HEADER)).toBe('7683')
    expect(request.headers.get(PREVIEW_FILES_MARK_HEADER)).toBeNull()
  }
})

it('keeps a files response streaming when the app close names its preview', async () => {
  const setup = await filesPreviewSetup(harness)
  const opened = await setup.open()
  expect(opened.status).toBe(201)
  const browser = await filesPreviewBrowser(setup, opened)
  const source = bodySource()
  harness.setResponse(() => relayResponse(source.stream))
  const response = await setup.handler.proxy(browser.request())
  const reader = response.body?.getReader()
  if (!reader) throw new Error('The files response body is missing.')
  const before = reader.read()
  source.send('before close')
  expect(new TextDecoder().decode((await before).value)).toBe('before close')
  const closed = await setup.handler.fetch(
    setup.request(new URL(browser.preview.url).pathname, {
      method: 'DELETE',
      body: '{}',
    }),
  )
  expect(closed.status).toBe(204)
  expect(source.cancelled).toBe(false)
  const after = reader.read()
  source.send('after close')
  expect(new TextDecoder().decode((await after).value)).toBe('after close')
  await reader.cancel()
})

it('rewrites a files folder redirect from the local file server to its preview hostname', async () => {
  const setup = await filesPreviewSetup(harness)
  const opened = await setup.open()
  expect(opened.status).toBe(201)
  const browser = await filesPreviewBrowser(setup, opened)
  harness.setResponse(() =>
    relayResponse(null, {
      status: 301,
      headers: { Location: 'http://localhost:7683/reports/?raw=1' },
    }),
  )
  const response = await setup.handler.proxy(
    browser.request(`${browser.previewUrl}/reports?raw=1`),
  )
  expect(response.status).toBe(301)
  expect(response.headers.get('Location')).toBe(
    `${browser.previewUrl}/reports/?raw=1`,
  )
})

it('refuses a files WebSocket upgrade before any cloud computer call', async () => {
  const setup = await filesPreviewSetup(harness)
  const opened = await setup.open()
  expect(opened.status).toBe(201)
  const browser = await filesPreviewBrowser(setup, opened)
  const cold = createPreviewHandler(harness.env, setup.dependencies)
  harness.requests.length = 0
  const response = await cold.proxy(
    browser.request(undefined, { headers: { Upgrade: 'websocket' } }),
  )
  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({
    error: {
      code: 'preview_not_found',
      message: 'The preview is not available.',
    },
  })
  expect(harness.requests).toEqual([])
})
