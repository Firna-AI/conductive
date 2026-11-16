import type { AutomationRunTrigger } from '../../src/shared/automations'
import type { AppDependencies } from '../env'

export interface DueAutomation {
  id: string
  orgId: string
  ownerId: string
  timeZone: string
  triggersJson: string
  nextRunAt: number
}

const eligible = `r.active = 1 AND EXISTS (
  SELECT 1 FROM orgs o JOIN users u ON u.id = r.owner_user_id
  JOIN org_members m ON m.org_id = o.id AND m.user_id = u.id
  WHERE o.id = r.org_id AND o.deleted_at IS NULL AND o.suspended_at IS NULL
    AND u.suspended_at IS NULL)`

export async function dueAutomationSchedules(
  db: D1Database,
  now: number,
  limit: number,
): Promise<DueAutomation[]> {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.org_id AS orgId, r.owner_user_id AS ownerId,
    r.time_zone AS timeZone, r.triggers_json AS triggersJson, r.next_run_at AS nextRunAt
    FROM automations r WHERE r.next_run_at <= ? AND ${eligible}
    ORDER BY r.next_run_at, r.id LIMIT ?`,
    )
    .bind(now, limit)
    .all<DueAutomation>()
  return results
}

export async function claimAutomationSchedule(
  db: D1Database,
  automation: DueAutomation,
  trigger: Extract<AutomationRunTrigger, { kind: 'schedule' }>,
  nextRunAt: number | null,
  now: number,
  dependencies: Pick<AppDependencies, 'randomToken'>,
): Promise<string | null> {
  const id = dependencies.randomToken()
  const matches = `r.org_id = ? AND r.id = ? AND r.next_run_at = ?
    AND r.owner_user_id = ? AND r.time_zone = ? AND r.triggers_json = ? AND ${eligible}`
  const values = [
    automation.orgId,
    automation.id,
    automation.nextRunAt,
    automation.ownerId,
    automation.timeZone,
    automation.triggersJson,
  ]
  const [inserted] = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO automation_runs
      (id, automation_id, org_id, owner_user_id, run_key, message_id, trigger_json, created_at, updated_at)
      SELECT ?, r.id, r.org_id, r.owner_user_id, ?, ?, ?, ?, ? FROM automations r
      WHERE ${matches}`,
      )
      .bind(
        id,
        `schedule:${automation.id}:${automation.nextRunAt}`,
        dependencies.randomToken(),
        JSON.stringify(trigger),
        now,
        now,
        ...values,
      ),
    db
      .prepare(
        `UPDATE automations AS r SET next_run_at = ?, updated_at = ? WHERE ${matches}`,
      )
      .bind(nextRunAt, now, ...values),
  ])
  return inserted.meta.changes > 0 ? id : null
}

export async function oldQueuedAutomationRuns(
  db: D1Database,
  now: number,
  limit: number,
): Promise<{ id: string; orgId: string }[]> {
  const { results } = await db
    .prepare(
      `SELECT id, org_id AS orgId FROM automation_runs
    WHERE state = 'queued' AND created_at < ? ORDER BY created_at, id LIMIT ?`,
    )
    .bind(now - 60_000, limit)
    .all<{ id: string; orgId: string }>()
  return results
}
