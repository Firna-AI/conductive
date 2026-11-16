import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { desktopPath } from '../../src/shared/desktop'
import { previewsPath, type PreviewResponse } from '../../src/shared/previews'
import { terminalPaths } from '../../src/shared/terminal'
import { createDesktopHandler } from '../desktop/handler'
import { createPreviewHandler } from '../previews/handler'
import { launchPreview } from '../previews/launch-test-support'
import { createToolsHarness, type ToolsHarness } from '../previews/test-support'
import { createTerminalHandler } from './handler'
import { startWorkspaceTerminal } from './service'

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
  const terminals = [
    {
      id: 'workspace',
      number: 1,
      socketPath: terminalPaths.terminalSocket(
        seed.orgId,
        seed.workspaceId,
        'workspace',
      ),
    },
  ]
  expect(await status.json()).toEqual({
    state: 'ready',
    protocol: 'tty',
    socketPath: terminalPaths.socket(seed.orgId, seed.workspaceId),
    terminals,
    several: false,
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
  const browser = await launchPreview(preview, seed.request, body.preview.url)
  const page = await preview.proxy(browser.request())
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
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
  )
    .bind(seed.workspaceId)
    .run()
  harness.requests.length = 0
  const list = await preview.fetch(
    seed.request(previewsPath(seed.orgId, seed.workspaceId)),
  )
  expect(list.status).toBe(200)
  const stopped = await terminal.fetch(
    seed.request(terminalPaths.connection(seed.orgId, seed.workspaceId)),
  )
  expect(stopped.status).toBe(200)
  expect(await stopped.json()).toEqual({
    state: 'stopped',
    socketPath: null,
    terminals,
    several: false,
  })
  const requests = [
    {
      handler: preview,
      request: seed.request(previewsPath(seed.orgId, seed.workspaceId), {
        method: 'POST',
        body: '{"port":3000}',
      }),
    },
    {
      handler: desktop,
      request: seed.request(desktopPath(seed.orgId, seed.workspaceId)),
    },
    {
      handler: terminal,
      request: seed.request(
        terminalPaths.socket(seed.orgId, seed.workspaceId),
        { headers: { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'tty' } },
      ),
    },
  ]
  for (const entry of requests) {
    const response = await entry.handler.fetch(entry.request)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: { code: 'sandbox_not_ready' },
    })
  }
  expect(harness.requests).toHaveLength(0)
})
