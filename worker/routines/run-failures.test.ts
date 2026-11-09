import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readRoutine } from './routine-data'
import { startRoutineRun } from './run-starter'
import { recordRoutineRun } from './run-record-data'
import { finishRoutineRun } from './run-outcome-data'
import { runFixture } from './runs.test-support'

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

it('keeps the failed start cause on its creation attempt and run after workspace removal', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, seedRun, boat } = fixture
  await seedRun()
  await fixture.run(() => startRoutineRun(runtime, org.id, 'run-one'))
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces',
    ).first('count'),
  ).toBe(1)
  const id = await runtime.env.DB.prepare(
    'SELECT workspace_id FROM routine_runs',
  ).first<string>('workspace_id')
  const actor = fixture.starts.get(id!)!
  boat.commandExitCode = 1
  for (let step = 0; step < 12 && (await actor.job()); step++)
    await actor.advance()
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces',
    ).first('count'),
  ).toBe(0)
  expect(
    await runtime.env.DB.prepare(
      'SELECT state, error_code AS code, error_message AS message FROM workspace_creation_attempts',
    ).first(),
  ).toEqual({
    state: 'failed',
    code: 'workspace_start_failed',
    message: 'The cloud computer could not start. Try again.',
  })
  expect(
    await runtime.env.DB.prepare(
      'SELECT state, error_code AS code, error_message AS message FROM routine_runs',
    ).first(),
  ).toEqual({
    state: 'failed',
    code: 'workspace_start_failed',
    message: 'The cloud computer could not start. Try again.',
  })
  expect(
    (await readRoutine(runtime.env.DB, org.id, 'routine-one')).failedRunsInARow,
  ).toBe(1)
})

it('skips queued runs whose routine, owner, or org cannot start them and does not count them as failures', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, user, seedRun } = fixture
  const db = runtime.env.DB
  await seedRun('failed-before-skip')
  await finishRoutineRun(
    db,
    org.id,
    'failed-before-skip',
    {
      state: 'failed',
      error: { code: 'agent_unavailable', message: 'Try again.' },
    },
    TEST_TIME,
  )
  const cases = [
    {
      code: 'routine_off',
      apply: "UPDATE routines SET active = 0 WHERE id = 'routine-one'",
      values: [],
      undo: "UPDATE routines SET active = 1 WHERE id = 'routine-one'",
      undoValues: [],
    },
    {
      code: 'owner_left',
      apply: 'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
      values: [org.id, user.id],
      undo: "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)",
      undoValues: [org.id, user.id, TEST_TIME],
    },
    {
      code: 'user_suspended',
      apply: 'UPDATE users SET suspended_at = ? WHERE id = ?',
      values: [TEST_TIME, user.id],
      undo: 'UPDATE users SET suspended_at = NULL WHERE id = ?',
      undoValues: [user.id],
    },
    {
      code: 'org_suspended',
      apply: 'UPDATE orgs SET suspended_at = ? WHERE id = ?',
      values: [TEST_TIME, org.id],
      undo: 'UPDATE orgs SET suspended_at = NULL WHERE id = ?',
      undoValues: [org.id],
    },
    {
      code: 'org_deleted',
      apply: 'UPDATE orgs SET deleted_at = ? WHERE id = ?',
      values: [TEST_TIME, org.id],
      undo: 'UPDATE orgs SET deleted_at = NULL WHERE id = ?',
      undoValues: [org.id],
    },
  ]
  for (const scenario of cases) {
    await seedRun(scenario.code, {
      kind: 'schedule',
      schedule: 'daily',
      scheduledAt: TEST_TIME,
    })
    await db
      .prepare(scenario.apply)
      .bind(...scenario.values)
      .run()
    expect(
      await recordRoutineRun(
        db,
        {
          orgId: org.id,
          routineId: 'routine-one',
          runKey: `schedule:routine-one:blocked-${scenario.code}`,
          trigger: {
            kind: 'schedule',
            schedule: 'daily',
            scheduledAt: TEST_TIME,
          },
        },
        runtime.dependencies,
      ),
      scenario.code,
    ).toBeNull()
    await startRoutineRun(runtime, org.id, scenario.code)
    expect(
      await db
        .prepare(
          'SELECT state, error_code AS code FROM routine_runs WHERE id = ?',
        )
        .bind(scenario.code)
        .first(),
      scenario.code,
    ).toEqual({
      state: 'skipped',
      code: scenario.code,
    })
    await db
      .prepare(scenario.undo)
      .bind(...scenario.undoValues)
      .run()
    await startRoutineRun(runtime, org.id, scenario.code)
  }
  expect(
    await db
      .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
      .first('count'),
  ).toBe(0)
  expect((await readRoutine(db, org.id, 'routine-one')).failedRunsInARow).toBe(
    1,
  )
})

it('does not run a queued manual request on the replacement owners logins after ownership moves', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, seedRun } = fixture
  await seedRun()
  const db = runtime.env.DB
  await db.batch([
    db
      .prepare(
        `INSERT INTO users (id, github_id, github_login, created_at, updated_at)
      VALUES ('replacement-owner', 44, 'replacement', ?, ?)`,
      )
      .bind(TEST_TIME, TEST_TIME),
    db
      .prepare(
        `INSERT INTO org_members (org_id, user_id, role, joined_at)
      VALUES (?, 'replacement-owner', 'admin', ?)`,
      )
      .bind(org.id, TEST_TIME),
    db.prepare(
      "UPDATE routines SET owner_user_id = 'replacement-owner', active = 0, inactive_reason = 'owner_left' WHERE id = 'routine-one'",
    ),
  ])
  await startRoutineRun(runtime, org.id, 'run-one')
  expect(
    await db
      .prepare(
        "SELECT state, error_code AS code FROM routine_runs WHERE id = 'run-one'",
      )
      .first(),
  ).toEqual({ state: 'skipped', code: 'owner_left' })
  expect(
    await db
      .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
      .first('count'),
  ).toBe(0)
})

it('counts each failed run once and turns the routine off at three failures', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, user, seedRun } = fixture
  await runtime.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
    .bind(user.id)
    .run()
  for (let index = 1; index <= 3; index++) {
    const id = await seedRun(`failed-${index}`)
    await Promise.all([
      startRoutineRun(runtime, org.id, id),
      startRoutineRun(runtime, org.id, id),
    ])
    expect(
      (await readRoutine(runtime.env.DB, org.id, 'routine-one'))
        .failedRunsInARow,
    ).toBe(index)
  }
  expect(
    await readRoutine(runtime.env.DB, org.id, 'routine-one'),
  ).toMatchObject({
    active: false,
    inactiveReason: 'failed_runs',
    failedRunsInARow: 3,
    nextRunAt: null,
  })
})
