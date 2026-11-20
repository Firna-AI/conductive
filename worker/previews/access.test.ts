import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { desktopPath } from '../../src/shared/desktop'
import { previewPath, previewsPath } from '../../src/shared/previews'
import { terminalPaths } from '../../src/shared/terminal'
import { createDesktopHandler } from '../desktop/handler'
import { createTerminalHandler } from '../terminal/handler'
import { WorkspaceTerminals } from '../terminal/workspace'
import { startWorkspaceTerminal } from '../terminal/service'
import { TEST_ORIGIN } from '../test-support/harness'
import { createPreviewHandler } from './handler'
import { createToolsHarness, type ToolsHarness } from './test-support'
import { activeMember, suspendWorkspaceOwner } from './suspension-test-support'

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
  const terminal = createTerminalHandler(
    harness.env,
    harness.dependencies,
    new WorkspaceTerminals(harness.native.actor(seed.workspaceId).api.chat),
  )
  const desktop = createDesktopHandler(harness.env, harness.dependencies)
  const routes = [
    {
      handler: preview,
      path: previewsPath(seed.orgId, seed.workspaceId),
      upgrade: false,
    },
    {
      handler: preview,
      path: previewPath(seed.orgId, seed.workspaceId, 'preview-one'),
      upgrade: false,
    },
    {
      handler: terminal,
      path: terminalPaths.socket(seed.orgId, seed.workspaceId),
      upgrade: true,
    },
    {
      handler: terminal,
      path: terminalPaths.terminalSocket(
        seed.orgId,
        seed.workspaceId,
        'workspace',
      ),
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
      handler: createPreviewHandler(harness.env, harness.dependencies),
      path: previewPath(other.id, seed.workspaceId, 'preview-one'),
      method: 'GET',
    },
    {
      handler: createTerminalHandler(
        harness.env,
        harness.dependencies,
        new WorkspaceTerminals(harness.native.actor(seed.workspaceId).api.chat),
      ),
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
  const denied = await routes[3].handler.fetch(
    seed.request(desktopPath(other.id, seed.workspaceId)),
  )
  expect(denied.status).toBe(404)
  expect(harness.requests).toHaveLength(0)
  await startWorkspaceTerminal(
    harness.env,
    seed.orgId,
    seed.workspaceId,
    harness.dependencies,
  )
  const member = await activeMember(harness, seed.orgId)
  await suspendWorkspaceOwner(harness, seed.workspaceId)
  harness.requests.length = 0
  const suspendedRoutes = [
    {
      handler: routes[0].handler,
      path: previewsPath(seed.orgId, seed.workspaceId),
      method: 'POST',
    },
    {
      handler: routes[1].handler,
      path: previewPath(seed.orgId, seed.workspaceId, 'preview-one'),
      method: 'GET',
    },
    {
      handler: routes[2].handler,
      path: terminalPaths.socket(seed.orgId, seed.workspaceId),
      method: 'GET',
    },
    {
      handler: routes[3].handler,
      path: desktopPath(seed.orgId, seed.workspaceId),
      method: 'GET',
    },
  ]
  for (const route of suspendedRoutes) {
    const response = await route.handler.fetch(
      member.request(route.path, {
        method: route.method,
        body: route.method === 'POST' ? '{"port":3000}' : undefined,
        headers: route.path.endsWith('/socket')
          ? { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'tty' }
          : {},
      }),
    )
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: 'user_suspended',
        message:
          'The workspace owner is suspended. Ask an admin to assign another member.',
      },
    })
  }
  expect(harness.requests).toHaveLength(0)
  expect(
    (
      await routes[0].handler.fetch(
        member.request(previewsPath(seed.orgId, seed.workspaceId)),
      )
    ).status,
  ).toBe(200)
  const status = await routes[2].handler.fetch(
    member.request(terminalPaths.connection(seed.orgId, seed.workspaceId)),
  )
  expect(status.status).toBe(200)
  expect(await status.json()).toMatchObject({ state: 'ready' })
})
