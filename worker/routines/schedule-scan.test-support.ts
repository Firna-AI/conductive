import type { RoutineTriggerInput } from '../../src/shared/routines'
import type { TestHarness } from '../test-support/harness'
import { runFixture } from './runs.test-support'
import { routineSchedule } from './schedules'

export const SCAN_TIME = Date.parse('2026-11-09T09:00:00Z')

export async function scanFixture(harness: TestHarness) {
  const fixture = await runFixture(harness)
  await fixture.setTime(SCAN_TIME)
  const db = fixture.runtime.env.DB
  const schedule = async (
    id = 'routine-one',
    dueAt = SCAN_TIME,
    triggers: readonly RoutineTriggerInput[] = [{ kind: 'hourly', minute: 0 }],
    timeZone = 'Europe/London',
  ) => {
    if (id !== 'routine-one')
      await db
        .prepare(
          `INSERT INTO routines
        (id, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort,
         time_zone, triggers_json, created_at, updated_at)
        SELECT ?, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort,
          time_zone, triggers_json, created_at, updated_at FROM routines WHERE id = 'routine-one'`,
        )
        .bind(id)
        .run()
    await db
      .prepare(
        'UPDATE routines SET triggers_json = ?, time_zone = ?, next_run_at = ? WHERE id = ?',
      )
      .bind(
        JSON.stringify(
          routineSchedule(triggers, timeZone, true, dueAt - 1).triggers,
        ),
        timeZone,
        dueAt,
        id,
      )
      .run()
  }
  const queued = async (id: string, age = 60_001) => {
    await fixture.seedRun(id, {
      kind: 'schedule',
      schedule: 'hourly',
      scheduledAt: SCAN_TIME - age,
    })
    await db
      .prepare(
        'UPDATE routine_runs SET created_at = ?, updated_at = ? WHERE id = ?',
      )
      .bind(SCAN_TIME - age, SCAN_TIME - age, id)
      .run()
  }
  const runs = () =>
    db
      .prepare(
        `SELECT id, routine_id AS routineId, run_key AS runKey, message_id AS messageId,
      state, trigger_json AS triggerJson, error_code AS code FROM routine_runs ORDER BY id`,
      )
      .all<{
        id: string
        routineId: string
        runKey: string
        messageId: string
        state: string
        triggerJson: string
        code: string | null
      }>()
  const nextTime = (id = 'routine-one') =>
    db
      .prepare('SELECT next_run_at FROM routines WHERE id = ?')
      .bind(id)
      .first<number | null>('next_run_at')
  const removeLogin = () => db.prepare('DELETE FROM agent_logins').run()
  return { ...fixture, db, schedule, queued, runs, nextTime, removeLogin }
}
