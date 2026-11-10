import { afterEach, beforeAll, expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import { chatHistoryPath } from '../../src/shared/events'
import { sessionsPath } from '../../src/shared/sessions'
import { workspacePaths } from '../../src/shared/workspaces'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { readWorkspaceResponse } from '../../src/app/api/read-workspaces'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})

it('returns the Restore contract through HTTP and refuses a legacy archive without a disk', async () => {
  const active = (fixture = await featureFixture(bundle))
  await active.env.DB.prepare(
    "UPDATE workspaces SET state = 'archived', archived_at = ?, sandbox_id = NULL WHERE id = ?",
  )
    .bind(DEVICE_TEST_NOW, OUTER_WORKSPACE)
    .run()
  const restore = () =>
    active.request(workspacePaths.restore(OUTER_ORG, OUTER_WORKSPACE), {
      method: 'POST',
      body: '{}',
      headers: { Cookie: active.cookies.memberCookie },
    })
  const absent = await restore()
  expect(absent.status).toBe(409)
  expect(await absent.json()).toMatchObject({
    error: {
      code: 'workspace_restore_unavailable',
    },
  })
  await active.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_retained' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const response = await restore()
  expect(response.status).toBe(200)
  expect(readWorkspaceResponse(await response.json()).workspace).toMatchObject({
    state: 'stopped',
    archivedAt: null,
    restoreUntil: null,
  })
  expect((await restore()).status).toBe(200)
})
afterEach(async () => {
  await fixture?.dispose()
})

it('archives without checking unpushed work and preserves read-only chat while retaining the sandbox', async () => {
  const active = (fixture = await featureFixture(bundle))
  await active.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_archive' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const sessionResponse = await active.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ choice: CLAUDE }) },
  )
  expect(sessionResponse.status).toBe(201)
  const sessionId = string(
    record(record(await sessionResponse.json()).session).id,
  )
  const archive = (headers = {}) =>
    active.request(workspacePaths.archive(OUTER_ORG, OUTER_WORKSPACE), {
      method: 'POST',
      headers,
      body: '{}',
    })
  expect((await archive({ Cookie: active.cookies.memberCookie })).status).toBe(
    403,
  )
  expect((await archive()).status).toBe(200)
  expect(active.boat.deletedIds).toEqual([])
  expect(
    await active.env.DB.prepare(
      'SELECT deleted_at FROM computer_ledger WHERE sandbox_id = ?',
    )
      .bind('bx_archive')
      .first('deleted_at'),
  ).toBeNull()
  const archived = await archive()
  expect(archived.status).toBe(200)
  expect(await archived.json()).toMatchObject({
    workspace: { state: 'archived' },
  })
  expect(active.boat.deletedIds).toEqual([])
  expect(
    await active.env.DB.prepare(
      'SELECT deleted_at FROM computer_ledger WHERE sandbox_id = ?',
    )
      .bind('bx_archive')
      .first('deleted_at'),
  ).toBeNull()
  const history = await active.request(
    chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, sessionId),
  )
  expect(history.status).toBe(200)
  expect(await history.json()).toMatchObject({
    events: expect.arrayContaining([
      expect.objectContaining({
        event: expect.objectContaining({ type: 'session.updated' }),
      }),
    ]),
  })
  expect(
    (await active.request(filePaths.tree(OUTER_ORG, OUTER_WORKSPACE))).status,
  ).toBe(404)
})
