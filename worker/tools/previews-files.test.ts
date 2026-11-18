import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  agentPreviewClosePath,
  agentPreviewsPath,
} from '../../src/shared/agent-previews'
import { record } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { machineRead } from './session-management.test-support'
import {
  previewToolFixture,
  type PreviewToolFixture,
} from './previews.test-support'

let bundle: string
let fixture: PreviewToolFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => fixture?.dispose())

it('keeps the files preview out of agent lists, opens, and closes', async () => {
  const active = (fixture = await previewToolFixture(bundle))
  await active.env.DB.prepare(
    'INSERT INTO preview_hostnames (id, hostname, org_id, workspace_id, port, created_at, expires_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
  )
    .bind(
      'files-preview',
      `${'a'.repeat(32)}.preview.test`,
      OUTER_ORG,
      OTHER_WORKSPACE,
      DEVICE_TEST_NOW,
      DEVICE_TEST_NOW + 86_400_000,
    )
    .run()
  const opened = await active.post(agentPreviewsPath(OTHER_WORKSPACE), {
    port: 3000,
  })
  expect(opened.status).toBe(201)
  const preview = record(record(await opened.json()).preview)
  const invalid = await active.post(agentPreviewsPath(OTHER_WORKSPACE), {
    port: 0,
  })
  expect(invalid.status).toBe(400)
  expect(await invalid.json()).toMatchObject({
    error: { code: 'invalid_port' },
  })
  const list = await machineRead(active, agentPreviewsPath(OTHER_WORKSPACE))
  expect(record(await list.json()).previews).toEqual([preview])
  const closed = await active.post(
    agentPreviewClosePath(OTHER_WORKSPACE, 'files-preview'),
    {},
  )
  expect(closed.status).toBe(200)
  expect(await closed.json()).toMatchObject({ closed: false })
  expect(
    await active.env.DB.prepare(
      'SELECT revoked_at FROM preview_hostnames WHERE id = ?',
    )
      .bind('files-preview')
      .first('revoked_at'),
  ).toBeNull()
  expect(
    (await (await active.actor(OTHER_WORKSPACE)).readChatWorkspaceSummary())
      .throughEventNumber,
  ).toBe(0)
})
