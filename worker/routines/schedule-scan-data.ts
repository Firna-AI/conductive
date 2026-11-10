import type { RoutineRunTrigger } from '../../src/shared/routines'
import type { AppDependencies } from '../env'

export interface DueRoutine {
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

export async function dueRoutineSchedules(
  db: D1Database,
  now: number,
  limit: number,
): Promise<DueRoutine[]> {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.org_id AS orgId, r.owner_user_id AS ownerId,
    r.time_zone AS timeZone, r.triggers_json AS triggersJson, r.next_run_at AS nextRunAt
    FROM routines r WHERE r.next_run_at <= ? AND ${eligible}
    ORDER BY r.next_run_at, r.id LIMIT ?`,
    )
    .bind(now, limit)
    .all<DueRoutine>()
  return results
}

export async function claimRoutineSchedule(
  db: D1Database,
  routine: DueRoutine,
  trigger: Extract<RoutineRunTrigger, { kind: 'schedule' }>,
  nextRunAt: number | null,
  now: number,
  dependencies: Pick<AppDependencies, 'randomToken'>,
): Promise<string | null> {
  const id = dependencies.randomToken()
  const matches = `r.org_id = ? AND r.id = ? AND r.next_run_at = ?
    AND r.owner_user_id = ? AND r.time_zone = ? AND r.triggers_json = ? AND ${eligible}`
  const values = [
    routine.orgId,
    routine.id,
    routine.nextRunAt,
    routine.ownerId,
    routine.timeZone,
    routine.triggersJson,
  ]
  const [inserted] = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO routine_runs
      (id, routine_id, org_id, owner_user_id, run_key, message_id, trigger_json, created_at, updated_at)
      SELECT ?, r.id, r.org_id, r.owner_user_id, ?, ?, ?, ?, ? FROM routines r
      WHERE ${matches}`,
      )
      .bind(
        id,
        `schedule:${routine.id}:${routine.nextRunAt}`,
        dependencies.randomToken(),
        JSON.stringify(trigger),
        now,
        now,
        ...values,
      ),
    db
      .prepare(
        `UPDATE routines AS r SET next_run_at = ?, updated_at = ? WHERE ${matches}`,
      )
      .bind(nextRunAt, now, ...values),
  ])
  return inserted.meta.changes > 0 ? id : null
}

export async function oldQueuedRoutineRuns(
  db: D1Database,
  now: number,
  limit: number,
): Promise<{ id: string; orgId: string }[]> {
  const { results } = await db
    .prepare(
      `SELECT id, org_id AS orgId FROM routine_runs
    WHERE state = 'queued' AND created_at < ? ORDER BY created_at, id LIMIT ?`,
    )
    .bind(now - 60_000, limit)
    .all<{ id: string; orgId: string }>()
  return results
}
