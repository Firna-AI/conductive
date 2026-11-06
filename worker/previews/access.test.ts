import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { desktopPath } from '../../src/shared/desktop'
import { previewsPath } from '../../src/shared/previews'
import { terminalPaths } from '../../src/shared/terminal'
import type { PreviewResponse } from '../../src/shared/previews'
import { createDesktopHandler } from '../desktop/handler'
import { createTerminalHandler } from '../terminal/handler'
import { startWorkspaceTerminal } from '../terminal/service'
import { TEST_ORIGIN } from '../test-support/harness'
import { createPreviewHandler } from './handler'
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

it('gates each tool route and terminal upgrade with sign-in and Origin before upstream calls', async () => {
  const seed = await harness.seed()
  const preview = createPreviewHandler(harness.env, harness.dependencies)
  const terminal = createTerminalHandler(harness.env, harness.dependencies)
  const desktop = createDesktopHandler(harness.env, harness.dependencies)
  const routes = [
    {
      handler: preview,
      path: previewsPath(seed.orgId, seed.workspaceId),
      upgrade: false,
    },
    {
      handler: terminal,
      path: terminalPaths.socket(seed.orgId, seed.workspaceId),
      upgrade: true,
    },
    {
      handler: desktop,
      path: desktopPath(seed.orgId, seed.workspaceId),
      upgrade: false,
    },
  ]
  for (const route of routes) {
    const headers = new Headers()
    if (route.upgrade) headers.set('Upgrade', 'websocket')
    headers.set('Origin', TEST_ORIGIN)
    const missing = await route.handler.fetch(
      new Request(`${TEST_ORIGIN}${route.path}`, {
        headers,
      }),
    )
    expect(missing.status).toBe(401)
    const hostile = seed.request(route.path, { headers })
    hostile.headers.set('Origin', 'https://attacker.test')
    expect((await route.handler.fetch(hostile)).status).toBe(403)
  }
  const missingOrigin = seed.request(
    terminalPaths.socket(seed.orgId, seed.workspaceId),
    {
      headers: { Upgrade: 'websocket' },
    },
  )
  missingOrigin.headers.delete('Origin')
  expect((await terminal.fetch(missingOrigin)).status).toBe(403)
  const noJson = seed.request(previewsPath(seed.orgId, seed.workspaceId), {
    method: 'POST',
    body: 'port=3000',
  })
  noJson.headers.set('Content-Type', 'text/plain')
  expect((await preview.fetch(noJson)).status).toBe(415)
  expect(harness.requests).toHaveLength(0)
})

it('checks current membership and workspace ownership before each tool upstream operation', async () => {
  const seed = await harness.seed()
  const other = await harness.createOrg(seed.session, 'Other org')
  const routes = [
    {
      handler: createPreviewHandler(harness.env, harness.dependencies),
      path: previewsPath(other.id, seed.workspaceId),
      method: 'POST',
    },
    {
      handler: createTerminalHandler(harness.env, harness.dependencies),
      path: terminalPaths.socket(other.id, seed.workspaceId),
      method: 'GET',
    },
    {
      handler: createDesktopHandler(harness.env, harness.dependencies),
      path: desktopPath(other.id, seed.workspaceId),
      method: 'GET',
    },
  ]
  for (const route of routes) {
    const request = seed.request(route.path, {
      method: route.method,
      body: route.method === 'POST' ? '{"port":3000}' : undefined,
      headers: route.path.endsWith('/socket')
        ? { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'tty' }
        : {},
    })
    expect((await route.handler.fetch(request)).status).toBe(404)
  }
  await harness.env.DB.prepare('DELETE FROM org_members WHERE org_id = ?')
    .bind(other.id)
    .run()
  const denied = await routes[2].handler.fetch(
    seed.request(desktopPath(other.id, seed.workspaceId)),
  )
  expect(denied.status).toBe(404)
  expect(harness.requests).toHaveLength(0)
})

it('keeps the terminal, port preview, and desktop available while a workspace needs input', async () => {
  const seed = await harness.seed()
  await startWorkspaceTerminal(
    harness.env,
    seed.orgId,
    seed.workspaceId,
    harness.dependencies,
  )
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'input' WHERE id = ?",
  )
    .bind(seed.workspaceId)
    .run()
  const terminal = createTerminalHandler(harness.env, harness.dependencies)
  const status = await terminal.fetch(
    seed.request(terminalPaths.connection(seed.orgId, seed.workspaceId)),
  )
  expect(await status.json()).toEqual({
    state: 'ready',
    protocol: 'tty',
    socketPath: terminalPaths.socket(seed.orgId, seed.workspaceId),
  })
  const preview = createPreviewHandler(harness.env, harness.dependencies)
  const opened = await preview.fetch(
    seed.request(previewsPath(seed.orgId, seed.workspaceId), {
      method: 'POST',
      body: '{"port":3000}',
    }),
  )
  expect(opened.status).toBe(201)
  const body: PreviewResponse = await opened.json()
  const page = await preview.proxy(new Request(body.preview.url))
  expect(page.status).toBe(200)
  expect(await page.text()).toBe('preview content')
  const desktop = createDesktopHandler(harness.env, harness.dependencies)
  expect(
    (
      await desktop.fetch(
        seed.request(desktopPath(seed.orgId, seed.workspaceId)),
      )
    ).status,
  ).toBe(200)
  const socket = await terminal.fetch(
    seed.request(terminalPaths.socket(seed.orgId, seed.workspaceId), {
      headers: { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'tty' },
    }),
  )
  expect(socket.status).toBe(101)
  harness.serverSockets[0].close(1000, 'finished')
  await harness.upstreamSockets[0].end
})
