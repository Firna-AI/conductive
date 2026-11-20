import type { AutomationTriggerInput } from '../../src/shared/automations'
import type { TestHarness } from '../test-support/harness'
import { seedAutomation } from '../test-support/d1-seeds'
import { runFixture } from './runs.test-support'
import { automationSchedule } from './schedules'

export const SCAN_TIME = Date.parse('2026-11-09T09:00:00Z')

export async function scanFixture(harness: TestHarness) {
  const fixture = await runFixture(harness)
  await fixture.setTime(SCAN_TIME)
  const db = fixture.runtime.env.DB
  const schedule = async (
    id = 'automation-one',
    dueAt = SCAN_TIME,
    triggers: readonly AutomationTriggerInput[] = [
      { kind: 'hourly', minute: 0 },
    ],
    timeZone = 'Europe/London',
  ) => {
    if (id !== 'automation-one')
      await seedAutomation(db, { id, copyFrom: 'automation-one' }).run()
    await db
      .prepare(
        'UPDATE automations SET triggers_json = ?, time_zone = ?, next_run_at = ? WHERE id = ?',
      )
      .bind(
        JSON.stringify(
          automationSchedule(triggers, timeZone, true, dueAt - 1).triggers,
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
        'UPDATE automation_runs SET created_at = ?, updated_at = ? WHERE id = ?',
      )
      .bind(SCAN_TIME - age, SCAN_TIME - age, id)
      .run()
  }
  const runs = () =>
    db
      .prepare(
        `SELECT id, automation_id AS automationId, run_key AS runKey, message_id AS messageId,
      state, trigger_json AS triggerJson, error_code AS code FROM automation_runs ORDER BY id`,
      )
      .all<{
        id: string
        automationId: string
        runKey: string
        messageId: string
        state: string
        triggerJson: string
        code: string | null
      }>()
  const nextTime = (id = 'automation-one') =>
    db
      .prepare('SELECT next_run_at FROM automations WHERE id = ?')
      .bind(id)
      .first<number | null>('next_run_at')
  const removeLogin = () => db.prepare('DELETE FROM agent_logins').run()
  return { ...fixture, db, schedule, queued, runs, nextTime, removeLogin }
}
