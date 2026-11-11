import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  routinePath,
  routinePaths,
  routinesPath,
} from '../../src/shared/routines'
import { workspaceViewPath } from '../../src/shared/workspace-view'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import { seedShellWorkspaceRuntime } from '../chat/integration/shell-api.test-support'
import {
  readRunPage,
  seedOuterRoutine,
  seedOuterRun,
} from './run-routes.test-support'

let bundle: string
let fixture: OuterRuntime
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
})

const routineUrl = routinePath(OUTER_ORG, 'outer-routine')
const nowUrl = routinePaths.runNow(OUTER_ORG, 'outer-routine')
const runsUrl = routinePaths.runs(OUTER_ORG, 'outer-routine')

it('lets only the owner use Run now while off, deduplicates request IDs, and refuses pull-request-only routines', async () => {
  fixture = await createOuterRuntime(bundle)
  await seedOuterRoutine(fixture)
  const post = (requestId: unknown, cookie = fixture.cookies.ownerCookie) =>
    fixture.request(nowUrl, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: JSON.stringify({ requestId }),
    })
  expect((await post('member', fixture.cookies.memberCookie)).status).toBe(403)
  expect((await post('outsider', fixture.cookies.outsiderCookie)).status).toBe(
    404,
  )
  expect((await post('')).status).toBe(400)
  expect((await post(undefined)).status).toBe(400)
  const replies = await Promise.all([post('request-one'), post('request-one')])
  expect(replies.map((response) => response.status)).toEqual([201, 201])
  const results = await Promise.all(replies.map((response) => response.json()))
  expect(results[0]).toMatchObject({
    run: {
      routineId: 'outer-routine',
      state: 'starting',
      trigger: { kind: 'run-now' },
      error: null,
    },
  })
  expect(results[1]).toEqual(results[0])
  expect(
    await fixture.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM routine_runs',
    ).first('count'),
  ).toBe(1)
  expect(
    await fixture.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspace_creation_attempts',
    ).first('count'),
  ).toBe(1)
  await fixture.env.DB.prepare(
    `UPDATE routines SET triggers_json = '[{"kind":"pull-request","event":"opened"}]' WHERE id = 'outer-routine'`,
  ).run()
  const refused = await post('pr-only')
  expect(refused.status).toBe(409)
  expect(await refused.json()).toMatchObject({
    error: { code: 'routine_pull_request_required' },
  })
  expect(
    await fixture.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM routine_runs',
    ).first('count'),
  ).toBe(1)
  await fixture.env.DB.prepare(
    "UPDATE routines SET owner_user_id = 'member' WHERE id = 'outer-routine'",
  ).run()
  expect((await post('admin-not-owner')).status).toBe(403)
})

it('lists 50 newest runs and reaches older runs with a stable cursor inside the same org and routine', async () => {
  fixture = await createOuterRuntime(bundle)
  await seedOuterRoutine(fixture)
  for (let index = 0; index < 52; index++)
    await seedOuterRun(fixture, `run-${String(index).padStart(2, '0')}`)
  const first = await fixture.request(runsUrl, {
    headers: { Cookie: fixture.cookies.memberCookie },
  })
  expect(first.status).toBe(200)
  const page = await readRunPage(first)
  expect(page.runs.map((run) => run.id)).toEqual(
    Array.from(
      { length: 50 },
      (_, index) => `run-${String(51 - index).padStart(2, '0')}`,
    ),
  )
  expect(page.nextCursor).toBe('run-02')
  await seedOuterRun(fixture, 'new-run', { at: 2 })
  const older = await fixture.request(
    routinePaths.runs(OUTER_ORG, 'outer-routine', page.nextCursor!),
  )
  expect(older.status).toBe(200)
  expect(await older.json()).toMatchObject({
    runs: [{ id: 'run-01' }, { id: 'run-00' }],
    nextCursor: null,
  })
  expect(
    (
      await fixture.request(
        routinePaths.runs(OUTER_ORG, 'outer-routine', 'foreign-run'),
      )
    ).status,
  ).toBe(400)
  expect(
    (
      await fixture.request(routinePaths.runs('other-org', 'outer-routine'), {
        headers: { Cookie: fixture.cookies.outsiderCookie },
      })
    ).status,
  ).toBe(404)
})

it('projects queued, skipped, live workspace, removed-start, and failed-first-turn states in runs and last run', async () => {
  fixture = await createOuterRuntime(bundle)
  await seedOuterRoutine(fixture)
  await seedOuterRun(fixture, 'queued')
  await seedOuterRun(fixture, 'skipped', {
    state: 'skipped',
    code: 'routine_off',
    message: 'The routine is off.',
  })
  await seedOuterRun(fixture, 'workspace', {
    state: 'started',
    workspaceId: OUTER_WORKSPACE,
  })
  for (const state of [
    'starting',
    'working',
    'input',
    'unread',
    'ready',
    'stopped',
    'error',
    'archived',
  ] as const) {
    await fixture.env.DB.prepare(
      'UPDATE workspaces SET state = ?, archived_at = ? WHERE id = ?',
    )
      .bind(state, state === 'archived' ? 1 : null, OUTER_WORKSPACE)
      .run()
    const response = await fixture.request(runsUrl)
    expect(response.status).toBe(200)
    const page = await readRunPage(response)
    expect(page.runs.find((run) => run.id === 'workspace')).toMatchObject({
      state,
      workspaceId: OUTER_WORKSPACE,
    })
  }
  await seedOuterRun(fixture, 'removed-start', {
    state: 'started',
    workspaceId: 'removed-workspace',
  })
  await fixture.env.DB.prepare(
    `INSERT INTO workspace_creation_attempts
    (workspace_id, org_id, sender_user_id, first_message_id, state, error_code, error_message, created_at)
    VALUES ('removed-workspace', ?, 'owner', 'message-removed-start', 'failed', 'workspace_start_failed', 'The start failed.', 1)`,
  )
    .bind(OUTER_ORG)
    .run()
  await seedOuterRun(fixture, 'first-turn-failed', {
    state: 'failed',
    workspaceId: OUTER_WORKSPACE,
    code: 'agent_unavailable',
    message: 'Try again.',
    at: 3,
  })
  const listed = await fixture.request(runsUrl)
  const page = await readRunPage(listed)
  expect(page.runs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'queued',
        state: 'queued',
        workspaceId: null,
        error: null,
      }),
      expect.objectContaining({
        id: 'skipped',
        state: 'skipped',
        error: { code: 'routine_off', message: 'The routine is off.' },
      }),
      expect.objectContaining({
        id: 'removed-start',
        state: 'failed',
        workspaceId: null,
        error: { code: 'workspace_start_failed', message: 'The start failed.' },
      }),
      expect.objectContaining({
        id: 'first-turn-failed',
        state: 'failed',
        workspaceId: OUTER_WORKSPACE,
        error: { code: 'agent_unavailable', message: 'Try again.' },
      }),
    ]),
  )
  const routines = await fixture.request(routinesPath(OUTER_ORG))
  expect(await routines.json()).toMatchObject({
    routines: [{ lastRun: { id: 'first-turn-failed', state: 'failed' } }],
  })
})

it('joins the routine into workspace views and removes its line after routine deletion', async () => {
  fixture = await createOuterRuntime(bundle)
  await seedShellWorkspaceRuntime(fixture)
  await seedOuterRoutine(fixture)
  const path = workspaceViewPath(OUTER_ORG, OUTER_WORKSPACE)
  expect(await (await fixture.request(path)).json()).toMatchObject({
    routine: null,
  })
  await seedOuterRun(fixture, 'workspace-run', {
    state: 'started',
    workspaceId: OUTER_WORKSPACE,
  })
  expect(
    await (
      await fixture.request(path, {
        headers: { Cookie: fixture.cookies.memberCookie },
      })
    ).json(),
  ).toMatchObject({
    routine: { id: 'outer-routine', name: 'Morning summary' },
  })
  expect(
    (await fixture.request(routineUrl, { method: 'DELETE', body: '{}' }))
      .status,
  ).toBe(204)
  expect(await (await fixture.request(path)).json()).toMatchObject({
    routine: null,
  })
  expect(
    await fixture.env.DB.prepare('SELECT id FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('id'),
  ).toBe(OUTER_WORKSPACE)
})
