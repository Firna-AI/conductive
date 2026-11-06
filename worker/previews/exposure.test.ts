import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { previewsPath, type PreviewResponse } from '../../src/shared/previews'
import { createToolsHarness, type ToolsHarness } from './test-support'
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

it('preserves a loopback server relay and shares its descriptor across preview hostnames and modules', async () => {
  const base = harness.dependencies.fetch
  const modes: unknown[] = []
  let commands = 0
  harness.dependencies.fetch = async (request) => {
    const path = new URL(request.url).pathname
    if (path.endsWith('/commands')) {
      commands++
      return Response.json({
        ok: true,
        type: 'command.finished',
        exitCode: 0,
        timedOut: false,
        stderr: '',
        stdout:
          'LISTEN 0 128 127.0.0.1:3000 0.0.0.0:*\nLISTEN 0 128 10.0.0.5:3000 0.0.0.0:*\n',
      })
    }
    if (path.endsWith('/host')) modes.push(await request.clone().json())
    return base(request)
  }
  const setup = await openPreview(harness)
  expect(modes).toEqual([{ port: 3000, public: false, localhost: true }])
  const another = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3000}',
    }),
  )
  const second: PreviewResponse = await another.json()
  const before = { commands, hosts: modes.length }
  for (const url of [setup.preview.url, second.preview.url]) {
    for (const path of ['/src/main.ts', '/src/component.ts']) {
      const response = await setup.handler.proxy(new Request(url + path))
      expect(await response.text()).toBe('preview content')
    }
  }
  expect({ commands, hosts: modes.length }).toEqual(before)
  expect(
    await harness.env.DB.prepare(
      'SELECT DISTINCT listener_mode AS mode FROM preview_hostnames',
    ).all(),
  ).toMatchObject({ results: [{ mode: 'localhost' }] })
  const document = await setup.handler.proxy(
    new Request(setup.preview.url, { headers: { 'Sec-Fetch-Dest': 'iframe' } }),
  )
  expect(await document.text()).toBe('preview content')
  expect({ commands, hosts: modes.length }).toEqual({
    commands: before.commands + 1,
    hosts: before.hosts + 1,
  })
})

it('invalidates a rejected descriptor without replaying a write and refreshes a changed sandbox in network mode', async () => {
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
    new Request(setup.preview.url, { method: 'POST', body: 'cart=2' }),
  )
  expect(refused.status).toBe(403)
  expect(writes).toBe(1)
  harness.requests.length = 0
  const next = await setup.handler.proxy(
    new Request(setup.preview.url + '/module.js'),
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
    new Request(setup.preview.url + '/other.js'),
  )
  expect(await moved.text()).toBe('preview content')
  const host = harness.requests.find((request) =>
    new URL(request.url).pathname.endsWith('/host'),
  )
  expect(host?.url).toBe('https://boat.dev/api/v1/sandboxes/bx_new/host')
  expect(await host?.json()).toEqual({
    port: 3000,
    public: false,
    localhost: false,
  })
})
