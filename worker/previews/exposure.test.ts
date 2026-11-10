import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  PREVIEW_RELAY_PORT,
  PREVIEW_RELAY_PORT_HEADER,
  previewsPath,
  type PreviewResponse,
} from '../../src/shared/previews'
import { createToolsHarness, type ToolsHarness } from './test-support'
import { launchPreview } from './launch-test-support'
import { openPreview } from './stream-test-support'

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

it('hosts the relay in localhost mode and reuses it for modules and page loads', async () => {
  const base = harness.dependencies.fetch
  const hosts: unknown[] = []
  const commands: unknown[] = []
  harness.dependencies.fetch = async (request) => {
    const path = new URL(request.url).pathname
    if (path.endsWith('/commands')) commands.push(await request.clone().json())
    if (path.endsWith('/host')) hosts.push(await request.clone().json())
    return base(request)
  }
  const setup = await openPreview(harness)
  expect(hosts).toEqual([
    { port: PREVIEW_RELAY_PORT, public: false, localhost: true },
  ])
  expect(commands).toEqual([
    {
      command: 'systemctl is-active --quiet conductive-preview-relay.service',
      timeoutSeconds: 600,
    },
  ])
  const another = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3000}',
    }),
  )
  const second: PreviewResponse = await another.json()
  const secondBrowser = await launchPreview(
    setup.handler,
    setup.request,
    second.preview.url,
  )
  const before = { commands: commands.length, hosts: hosts.length }
  for (const browser of [
    { previewUrl: setup.previewUrl, request: setup.previewRequest },
    secondBrowser,
  ]) {
    for (const path of ['/src/main.ts', '/src/component.ts']) {
      const response = await setup.handler.proxy(
        browser.request(browser.previewUrl + path),
      )
      expect(await response.text()).toBe('preview content')
    }
  }
  expect({ commands: commands.length, hosts: hosts.length }).toEqual(before)
  for (const destination of ['document', 'iframe']) {
    const document = await setup.handler.proxy(
      setup.previewRequest(setup.previewUrl, {
        headers: { 'Sec-Fetch-Dest': destination },
      }),
    )
    expect(await document.text()).toBe('preview content')
  }
  expect({ commands: commands.length, hosts: hosts.length }).toEqual(before)
})

it('invalidates a rejected descriptor without replaying a write and resolves the relay in a changed sandbox', async () => {
  const setup = await openPreview(harness)
  const base = harness.dependencies.fetch
  let writes = 0
  harness.dependencies.fetch = async (request) => {
    const url = new URL(request.url)
    if (url.hostname !== 'boat.dev' && request.method === 'POST') {
      writes++
      return new Response('refused', { status: 403 })
    }
    return base(request)
  }
  const refused = await setup.handler.proxy(
    setup.previewRequest(setup.previewUrl, { method: 'POST', body: 'cart=2' }),
  )
  expect(refused.status).toBe(502)
  expect(writes).toBe(1)
  harness.requests.length = 0
  const next = await setup.handler.proxy(
    setup.previewRequest(setup.previewUrl + '/module.js'),
  )
  expect(await next.text()).toBe('preview content')
  expect(
    harness.requests.filter((request) =>
      new URL(request.url).pathname.endsWith('/host'),
    ),
  ).toHaveLength(1)
  await harness.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_new' WHERE id = ?",
  )
    .bind(setup.workspaceId)
    .run()
  harness.requests.length = 0
  const moved = await setup.handler.proxy(
    setup.previewRequest(setup.previewUrl + '/other.js'),
  )
  expect(await moved.text()).toBe('preview content')
  const host = harness.requests.find((request) =>
    new URL(request.url).pathname.endsWith('/host'),
  )
  expect(host?.url).toBe('https://boat.dev/api/v1/sandboxes/bx_new/host')
  expect(await host?.json()).toEqual({
    port: PREVIEW_RELAY_PORT,
    public: false,
    localhost: true,
  })
  const upstream = harness.requests.find(
    (request) => new URL(request.url).hostname !== 'boat.dev',
  )
  expect(upstream?.headers.get(PREVIEW_RELAY_PORT_HEADER)).toBe('3000')
})
