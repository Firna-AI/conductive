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
import { featureFixture, type FeatureFixture } from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('checks actual unpushed work before archive and preserves read-only chat after sandbox deletion', async () => {
  const active = (fixture = await featureFixture(bundle))
  await active.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_archive' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  active.boat.synchronousOutput = ' M draft.txt\0\0' + '2\n'
  const sessionResponse = await active.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ choice: CLAUDE }) },
  )
  expect(sessionResponse.status).toBe(201)
  const sessionId = string(
    record(record(await sessionResponse.json()).session).id,
  )
  const check = await active.request(
    workspacePaths.archiveCheck(OUTER_ORG, OUTER_WORKSPACE),
  )
  expect(check.status).toBe(200)
  expect(await check.json()).toEqual({
    uncommittedFiles: ['draft.txt'],
    unpushedCommits: 2,
  })
  const archive = (discardUnpushedWork: boolean, headers = {}) =>
    active.request(workspacePaths.archive(OUTER_ORG, OUTER_WORKSPACE), {
      method: 'POST',
      headers,
      body: JSON.stringify({ discardUnpushedWork }),
    })
  expect(
    (await archive(true, { Cookie: active.cookies.memberCookie })).status,
  ).toBe(403)
  expect((await archive(false)).status).toBe(409)
  expect(active.boat.deletedIds).toEqual([])
  expect(
    await active.env.DB.prepare(
      'SELECT deleted_at FROM computer_ledger WHERE sandbox_id = ?',
    )
      .bind('bx_archive')
      .first('deleted_at'),
  ).toBeNull()
  const archived = await archive(true)
  expect(archived.status).toBe(200)
  expect(await archived.json()).toMatchObject({
    workspace: { state: 'archived' },
  })
  expect(active.boat.deletedIds).toEqual(['bx_archive'])
  expect(
    await active.env.DB.prepare(
      'SELECT deleted_at FROM computer_ledger WHERE sandbox_id = ?',
    )
      .bind('bx_archive')
      .first('deleted_at'),
  ).toEqual(expect.any(Number))
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
