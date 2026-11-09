import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { interceptMembersWrite } from '../members/guarded-write.test-support'
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

it('rechecks access and the saved schedule when it claims a due time', async () => {
  const fixture = await scanFixture(harness)
  const { db, user, org } = fixture
  await fixture.schedule()
  await fixture.removeLogin()
  await db.batch([
    db.prepare(
      "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('replacement-owner', 44, 'replacement', 1, 1)",
    ),
    db
      .prepare(
        "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, 'replacement-owner', 'admin', 1)",
      )
      .bind(org.id),
  ])
  const cases = [
    {
      apply: 'UPDATE users SET suspended_at = 1 WHERE id = ?',
      undo: 'UPDATE users SET suspended_at = NULL WHERE id = ?',
      values: [user.id],
    },
    {
      apply: 'UPDATE orgs SET suspended_at = 1 WHERE id = ?',
      undo: 'UPDATE orgs SET suspended_at = NULL WHERE id = ?',
      values: [org.id],
    },
    {
      apply: 'UPDATE orgs SET deleted_at = 1 WHERE id = ?',
      undo: 'UPDATE orgs SET deleted_at = NULL WHERE id = ?',
      values: [org.id],
    },
    {
      apply: 'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
      undo: "INSERT OR IGNORE INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', 1)",
      values: [org.id, user.id],
    },
    {
      apply: 'UPDATE routines SET active = 0 WHERE id = ?',
      undo: 'UPDATE routines SET active = 1 WHERE id = ?',
      values: ['routine-one'],
    },
    {
      apply: 'UPDATE routines SET next_run_at = ? WHERE id = ?',
      undo: 'UPDATE routines SET next_run_at = ? WHERE id = ?',
      values: [SCAN_TIME + 7_200_000, 'routine-one'],
      undoValues: [SCAN_TIME, 'routine-one'],
      nextAt: SCAN_TIME + 7_200_000,
    },
    {
      apply:
        "UPDATE routines SET owner_user_id = 'replacement-owner' WHERE id = ?",
      undo: 'UPDATE routines SET owner_user_id = ? WHERE id = ?',
      values: ['routine-one'],
      undoValues: [user.id, 'routine-one'],
    },
    {
      apply: 'UPDATE routines SET triggers_json = ? WHERE id = ?',
      undo: 'UPDATE routines SET triggers_json = ? WHERE id = ?',
      values: [
        JSON.stringify([
          { kind: 'daily', time: { hour: 9, minute: 0 }, cron: '0 9 * * *' },
        ]),
        'routine-one',
      ],
      undoValues: [
        JSON.stringify([{ kind: 'hourly', minute: 0, cron: '0 * * * *' }]),
        'routine-one',
      ],
    },
    {
      apply: "UPDATE routines SET time_zone = 'UTC' WHERE id = ?",
      undo: "UPDATE routines SET time_zone = 'Europe/London' WHERE id = ?",
      values: ['routine-one'],
    },
  ]
  for (const scenario of cases) {
    const intercept = interceptMembersWrite(db, () =>
      db
        .prepare(scenario.apply)
        .bind(...scenario.values)
        .run(),
    )
    await scanRoutineSchedules({
      ...fixture.runtime,
      env: { ...fixture.runtime.env, DB: intercept.db },
    })
    expect((await fixture.runs()).results, scenario.apply).toEqual([])
    expect(await fixture.nextTime(), scenario.apply).toBe(
      scenario.nextAt ?? SCAN_TIME,
    )
    await db
      .prepare(scenario.undo)
      .bind(...(scenario.undoValues ?? scenario.values))
      .run()
  }
})

it('rolls back a claim if the batch fails and continues other due routines and queued runs', async () => {
  const fixture = await scanFixture(harness)
  const { db } = fixture
  await fixture.schedule()
  await fixture.schedule('routine-two')
  await fixture.queued('old')
  await fixture.removeLogin()
  await db
    .prepare(
      `CREATE TRIGGER refuse_schedule_claim BEFORE UPDATE OF next_run_at ON routines
    WHEN NEW.id = 'routine-one' AND NEW.next_run_at != OLD.next_run_at
    BEGIN SELECT RAISE(ABORT, 'Injected claim failure'); END`,
    )
    .run()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await scanRoutineSchedules(fixture.runtime)
    expect(await fixture.nextTime()).toBe(SCAN_TIME)
    expect(await fixture.nextTime('routine-two')).toBe(
      Date.parse('2026-11-09T10:00:00Z'),
    )
    const { results } = await fixture.runs()
    expect(results.map((row) => [row.routineId, row.state, row.code])).toEqual([
      ['routine-two', 'failed', 'agent_login_required'],
      ['routine-one', 'failed', 'agent_login_required'],
    ])
    expect(warning).toHaveBeenCalledWith(
      'A routine schedule could not run. The next scan will try again.',
    )
  } finally {
    warning.mockRestore()
    await db.prepare('DROP TRIGGER refuse_schedule_claim').run()
  }
})
