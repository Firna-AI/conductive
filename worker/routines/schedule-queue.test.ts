import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { scanRoutineSchedules } from './schedule-scan'
import { SCAN_TIME, scanFixture } from './schedule-scan.test-support'

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

it('restarts only queued runs older than one minute with their stored message identity', async () => {
  const fixture = await scanFixture(harness)
  await fixture.queued('old')
  await fixture.queued('boundary', 60_000)
  await fixture.queued('fresh', 59_999)
  await fixture.queued('failed')
  await fixture.queued('skipped')
  await fixture.queued('started')
  await fixture.db.batch(
    ['failed', 'skipped', 'started'].map((state) =>
      fixture.db
        .prepare('UPDATE routine_runs SET state = ? WHERE id = ?')
        .bind(state, state),
    ),
  )
  await fixture.run(() => scanRoutineSchedules(fixture.runtime))
  await fixture.setTime(SCAN_TIME)
  await scanRoutineSchedules(fixture.runtime)
  expect(
    (await fixture.runs()).results.map((row) => [
      row.id,
      row.state,
      row.messageId,
    ]),
  ).toEqual([
    ['boundary', 'queued', 'message-boundary'],
    ['failed', 'failed', 'message-failed'],
    ['fresh', 'queued', 'message-fresh'],
    ['old', 'started', 'message-old'],
    ['skipped', 'skipped', 'message-skipped'],
    ['started', 'started', 'message-started'],
  ])
  expect(
    await fixture.db
      .prepare('SELECT first_message_id FROM workspace_creation_attempts')
      .first('first_message_id'),
  ).toBe('message-old')
  expect(fixture.acceptFirstMessage).toHaveBeenCalledTimes(1)
})

it('skips blocked queued runs with their reason and stops retrying them after access returns', async () => {
  const fixture = await scanFixture(harness)
  const { db, org, user } = fixture
  const cases = [
    {
      code: 'routine_off',
      apply: 'UPDATE routines SET active = 0 WHERE id = ?',
      undo: 'UPDATE routines SET active = 1 WHERE id = ?',
      values: ['routine-one'],
    },
    {
      code: 'owner_left',
      apply: 'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
      undo: "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', 1)",
      values: [org.id, user.id],
    },
    {
      code: 'user_suspended',
      apply: 'UPDATE users SET suspended_at = 1 WHERE id = ?',
      undo: 'UPDATE users SET suspended_at = NULL WHERE id = ?',
      values: [user.id],
    },
    {
      code: 'org_suspended',
      apply: 'UPDATE orgs SET suspended_at = 1 WHERE id = ?',
      undo: 'UPDATE orgs SET suspended_at = NULL WHERE id = ?',
      values: [org.id],
    },
    {
      code: 'org_deleted',
      apply: 'UPDATE orgs SET deleted_at = 1 WHERE id = ?',
      undo: 'UPDATE orgs SET deleted_at = NULL WHERE id = ?',
      values: [org.id],
    },
  ]
  for (const scenario of cases) {
    await fixture.queued(scenario.code)
    await db
      .prepare(scenario.apply)
      .bind(...scenario.values)
      .run()
    await scanRoutineSchedules(fixture.runtime)
    expect(
      await db
        .prepare(
          'SELECT state, error_code AS code FROM routine_runs WHERE id = ?',
        )
        .bind(scenario.code)
        .first(),
    ).toEqual({ state: 'skipped', code: scenario.code })
    await db
      .prepare(scenario.undo)
      .bind(...scenario.values)
      .run()
    await scanRoutineSchedules(fixture.runtime)
  }
  expect(
    await db
      .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
      .first('count'),
  ).toBe(0)
  expect(
    await db
      .prepare('SELECT failed_runs_in_a_row FROM routines')
      .first('failed_runs_in_a_row'),
  ).toBe(0)
})

it('limits each scan to its due and queued batch sizes and leaves the rest for the next minute', async () => {
  const fixture = await scanFixture(harness)
  const { db } = fixture
  const limits = { dueRoutines: 2, queuedRuns: 2 }
  await fixture.schedule()
  const ids = JSON.stringify(
    Array.from({ length: 3 }, (_, index) => String(index + 1).padStart(2, '0')),
  )
  await db.batch([
    db
      .prepare(
        `INSERT INTO routines
      (id, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort,
       time_zone, triggers_json, next_run_at, created_at, updated_at)
      SELECT 'due-' || j.value, r.org_id, r.owner_user_id, r.name, r.repository_id, r.section_id,
        r.prompt, r.agent, r.model, r.effort, r.time_zone, r.triggers_json, r.next_run_at, r.created_at, r.updated_at
      FROM routines r, json_each(?) j WHERE r.id = 'routine-one'`,
      )
      .bind(ids),
    db
      .prepare(
        `INSERT INTO routine_runs
      (id, routine_id, org_id, owner_user_id, run_key, message_id, trigger_json, created_at, updated_at)
      SELECT 'queued-' || j.value, r.id, r.org_id, r.owner_user_id, 'manual:routine-one:queued-' || j.value,
        'message-queued-' || j.value, '{"kind":"schedule","schedule":"hourly","scheduledAt":0}', ?, ?
      FROM routines r, json_each(?) j WHERE r.id = 'routine-one'`,
      )
      .bind(SCAN_TIME - 60_001, SCAN_TIME - 60_001, ids),
    db.prepare(
      "UPDATE routines SET active = 0, next_run_at = NULL WHERE id = 'routine-one'",
    ),
    db.prepare('DELETE FROM agent_logins'),
  ])
  await scanRoutineSchedules(fixture.runtime, limits)
  const counts = () =>
    db
      .prepare(
        `SELECT state, COUNT(*) AS count FROM routine_runs GROUP BY state ORDER BY state`,
      )
      .all<{ state: string; count: number }>()
  expect((await counts()).results).toEqual([
    { state: 'failed', count: 2 },
    { state: 'queued', count: 1 },
    { state: 'skipped', count: 2 },
  ])
  expect(await fixture.nextTime('due-03')).toBe(SCAN_TIME)
  await fixture.setTime(SCAN_TIME + 60_000)
  await scanRoutineSchedules(fixture.runtime, limits)
  expect((await counts()).results).toEqual([
    { state: 'failed', count: 3 },
    { state: 'skipped', count: 3 },
  ])
  expect(await fixture.nextTime('due-03')).toBe(
    Date.parse('2026-11-09T10:00:00Z'),
  )
  expect(
    await db
      .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
      .first('count'),
  ).toBe(0)
})
