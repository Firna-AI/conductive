import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { workspaceViewPath } from '../../src/shared/workspace-view'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { pullRequestFixture } from './pull-request.test-support'
import { scanRoutineSchedules } from './schedule-scan'
import { startRoutineRun } from './run-starter'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it.each(['link write', 'accept'])(
  'keeps an admitted run queued after a failed %s and recovers its workspace on the next scan',
  async (failure) => {
    const h = await pullRequestFixture(harness)
    expect((await h.request(h.payload())).status).toBe(204)
    if (failure === 'link write')
      await h.db
        .prepare(
          `CREATE TRIGGER refuse_run_link BEFORE UPDATE OF workspace_id ON routine_runs
        WHEN NEW.workspace_id IS NOT NULL
        BEGIN SELECT RAISE(ABORT, 'Injected link failure'); END`,
        )
        .run()
    else
      h.acceptFirstMessage.mockRejectedValueOnce(
        new Error('private prompt and token'),
      )
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await h.run(() => h.background[0]())
      expect((await h.rows()).results).toMatchObject([
        { state: 'queued', code: null },
      ])
      expect(
        await h.db
          .prepare('SELECT failed_runs_in_a_row FROM routines')
          .first('failed_runs_in_a_row'),
      ).toBe(0)
      const workspace = await h.db
        .prepare('SELECT id, branch FROM workspaces')
        .first<{ id: string; branch: string }>()
      expect(workspace).not.toBeNull()
      const view = await harness.request(
        workspaceViewPath(h.org.id, workspace!.id),
        h.session,
      )
      expect(view.status).toBe(200)
      expect(await view.json()).toMatchObject({
        routine: {
          id: 'routine-one',
          name: 'Morning summary',
          pullRequest: {
            number: 2,
            url: 'https://github.com/example/repository/pull/2',
          },
        },
      })
      const ownBranch = h.payload()
      ownBranch.number = 3
      ownBranch.pull_request.number = 3
      ownBranch.pull_request.head.ref = workspace!.branch
      expect((await h.request(ownBranch, 'own-branch')).status).toBe(204)
      expect(
        (await h.request(h.payload('synchronize'), 'owner-push')).status,
      ).toBe(204)
      expect((await h.rows()).results).toHaveLength(1)
      expect(warning).toHaveBeenCalledWith({
        kind: 'routine_queued_start_failed',
        message:
          'A queued routine run could not start. The next scan will try again.',
      })
      if (failure === 'link write')
        await h.db.prepare('DROP TRIGGER refuse_run_link').run()
      await h.setTime(TEST_TIME + 60_001)
      await h.run(() => scanRoutineSchedules(h.runtime))
      expect(
        await h.db
          .prepare(
            'SELECT state, workspace_id AS workspaceId FROM routine_runs',
          )
          .first(),
      ).toEqual({ state: 'started', workspaceId: workspace!.id })
      expect(
        await h.db
          .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
          .first('count'),
      ).toBe(1)
      expect(
        await h.db
          .prepare('SELECT failed_runs_in_a_row FROM routines')
          .first('failed_runs_in_a_row'),
      ).toBe(0)
    } finally {
      warning.mockRestore()
      await h.db.prepare('DROP TRIGGER IF EXISTS refuse_run_link').run()
    }
  },
)

it('links an admitted queued run after its routine turns off without skipping or creating another workspace', async () => {
  const h = await pullRequestFixture(harness)
  await h.seedRun('already-admitted', {
    kind: 'schedule',
    schedule: 'hourly',
    scheduledAt: TEST_TIME,
  })
  await h.run(() => startRoutineRun(h.runtime, h.org.id, 'already-admitted'))
  const workspaceId = await h.db
    .prepare('SELECT workspace_id FROM routine_runs')
    .first<string>('workspace_id')
  await h.db.batch([
    h.db.prepare(
      "UPDATE routine_runs SET state = 'queued', workspace_id = NULL",
    ),
    h.db.prepare('UPDATE routines SET active = 0, next_run_at = NULL'),
    h.db.prepare('DELETE FROM agent_logins'),
    h.db.prepare('DELETE FROM github_connections'),
  ])
  await h.setTime(TEST_TIME + 60_001)
  await h.run(() => scanRoutineSchedules(h.runtime))
  expect(
    await h.db
      .prepare(
        'SELECT state, workspace_id AS workspaceId, error_code AS code FROM routine_runs',
      )
      .first(),
  ).toEqual({ state: 'started', workspaceId, code: null })
  expect(
    await h.db
      .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
      .first('count'),
  ).toBe(1)
  expect(
    await h.db
      .prepare('SELECT failed_runs_in_a_row FROM routines')
      .first('failed_runs_in_a_row'),
  ).toBe(0)
})
