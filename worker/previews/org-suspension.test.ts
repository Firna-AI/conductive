import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { desktopPath } from '../../src/shared/desktop'
import { previewsPath } from '../../src/shared/previews'
import { terminalPaths } from '../../src/shared/terminal'
import { createDesktopHandler } from '../desktop/handler'
import { createTerminalHandler } from '../terminal/handler'
import { TEST_ORIGIN } from '../test-support/harness'
import { createPreviewHandler } from './handler'
import { handoffRequest, launchForm } from './launch-test-support'
import { relayResponse } from './relay.test-support'
import { bodySource, openPreview } from './stream-test-support'
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

it('refuses suspended org sandbox entry before provider calls and stops old grants and preview data', async () => {
  const setup = await openPreview(harness)
  const launch = await setup.handler.fetch(
    setup.request(new URL(setup.preview.url).pathname),
  )
  const unused = launchForm(await launch.text())
  const source = bodySource()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) =>
    new URL(request.url).hostname === 'boat.dev'
      ? base(request)
      : relayResponse(source.stream)
  const response = await setup.handler.proxy(setup.previewRequest())
  const reader = response.body?.getReader()
  const before = reader?.read()
  source.send('before suspension')
  expect(new TextDecoder().decode((await before)?.value)).toBe(
    'before suspension',
  )
  await harness.env.DB.prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(setup.orgId)
    .run()
  harness.requests.length = 0
  const preview = createPreviewHandler(harness.env, harness.dependencies)
  const terminal = createTerminalHandler(harness.env, harness.dependencies)
  const desktop = createDesktopHandler(harness.env, harness.dependencies)
  for (const [handler, request] of [
    [
      preview,
      setup.request(previewsPath(setup.orgId, setup.workspaceId), {
        method: 'POST',
        body: '{"port":3000}',
      }),
    ],
    [preview, setup.request(new URL(setup.preview.url).pathname)],
    [
      terminal,
      setup.request(terminalPaths.socket(setup.orgId, setup.workspaceId), {
        headers: { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'tty' },
      }),
    ],
    [desktop, setup.request(desktopPath(setup.orgId, setup.workspaceId))],
  ] as const) {
    const refused = await handler.fetch(request)
    expect(refused.status).toBe(403)
    expect(await refused.json()).toEqual({
      error: {
        code: 'org_suspended',
        message:
          'This org is suspended. For questions, write to abuse@conductive.build.',
      },
    })
  }
  expect(
    (await setup.handler.proxy(handoffRequest(unused, TEST_ORIGIN))).status,
  ).toBe(404)
  expect((await preview.proxy(setup.previewRequest())).status).toBe(404)
  const after = reader?.read()
  source.send('after suspension')
  await expect(after).rejects.toMatchObject({ name: 'AbortError' })
  expect(source.cancelled).toBe(true)
  expect(harness.requests).toEqual([])
})
