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

it('starts an exactly due routine once across overlapping scans and leaves future times alone', async () => {
  const fixture = await scanFixture(harness)
  await fixture.schedule('routine-one', SCAN_TIME, [
    { kind: 'hourly', minute: 0 },
    { kind: 'daily', time: { hour: 9, minute: 0 } },
  ])
  await fixture.schedule('future', SCAN_TIME + 3_600_000)
  await fixture.run(() =>
    Promise.all([
      scanRoutineSchedules(fixture.runtime),
      scanRoutineSchedules(fixture.runtime),
    ]),
  )
  fixture.setTime(SCAN_TIME + 59_000)
  await scanRoutineSchedules(fixture.runtime)
  const { results } = await fixture.runs()
  expect(results).toHaveLength(1)
  expect(results[0]).toMatchObject({
    routineId: 'routine-one',
    runKey: `schedule:routine-one:${SCAN_TIME}`,
    state: 'started',
    code: null,
  })
  expect(JSON.parse(results[0].triggerJson)).toEqual({
    kind: 'schedule',
    schedule: 'hourly',
    scheduledAt: SCAN_TIME,
  })
  expect(await fixture.nextTime()).toBe(Date.parse('2026-11-09T10:00:00Z'))
  expect(await fixture.nextTime('future')).toBe(
    Date.parse('2026-11-09T10:00:00Z'),
  )
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
      .first('count'),
  ).toBe(1)
  expect(fixture.acceptFirstMessage).toHaveBeenCalledTimes(1)
})

it('collapses missed times into one run and records the schedule that supplied the due time', async () => {
  const fixture = await scanFixture(harness)
  const dueAt = Date.parse('2026-11-06T14:00:00Z')
  await fixture.schedule(
    'routine-one',
    dueAt,
    [
      { kind: 'hourly', minute: 30 },
      { kind: 'daily', time: { hour: 9, minute: 0 } },
    ],
    'America/New_York',
  )
  await fixture.run(() => scanRoutineSchedules(fixture.runtime))
  await scanRoutineSchedules(fixture.runtime)
  const { results } = await fixture.runs()
  expect(results).toHaveLength(1)
  expect(results[0].state).toBe('started')
  expect(JSON.parse(results[0].triggerJson)).toEqual({
    kind: 'schedule',
    schedule: 'daily',
    scheduledAt: dueAt,
  })
  expect(await fixture.nextTime()).toBe(Date.parse('2026-11-09T09:30:00Z'))
})

it('preserves due times for blocked owners and orgs and runs a restored org once', async () => {
  const fixture = await scanFixture(harness)
  const { db, org, user } = fixture
  const dueAt = Date.parse('2026-11-06T09:00:00Z')
  await fixture.schedule('routine-one', dueAt)
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
      undo: "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', 1)",
      values: [org.id, user.id],
    },
    {
      apply: 'UPDATE routines SET active = 0 WHERE id = ?',
      undo: 'UPDATE routines SET active = 1 WHERE id = ?',
      values: ['routine-one'],
    },
  ]
  for (const scenario of cases) {
    await db
      .prepare(scenario.apply)
      .bind(...scenario.values)
      .run()
    await scanRoutineSchedules(fixture.runtime)
    expect((await fixture.runs()).results, scenario.apply).toEqual([])
    expect(await fixture.nextTime(), scenario.apply).toBe(dueAt)
    await db
      .prepare(scenario.undo)
      .bind(...scenario.values)
      .run()
  }
  await fixture.run(() => scanRoutineSchedules(fixture.runtime))
  await scanRoutineSchedules(fixture.runtime)
  expect((await fixture.runs()).results).toHaveLength(1)
  expect(await fixture.nextTime()).toBe(Date.parse('2026-11-09T10:00:00Z'))
})
