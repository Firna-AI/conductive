import type { Routine } from '../../src/shared/routines'
import { activeShellMemberPredicate } from '../app-api/feature-shell-access'

const referencesExist = `EXISTS (SELECT 1 FROM repositories WHERE org_id = ? AND id = ? AND selected = 1)
  AND EXISTS (SELECT 1 FROM sections WHERE org_id = ? AND id = ?)`

const ownerOrAdmin = `(owner_user_id = ? OR EXISTS (
  SELECT 1 FROM org_members WHERE org_id = routines.org_id AND user_id = ? AND role = 'admin'
))`

export async function saveRoutine(
  db: D1Database,
  input: Routine,
  actorId: string,
  create: boolean,
  activeChanged = false,
): Promise<boolean> {
  const fields = [
    input.name,
    input.repositoryId,
    input.sectionId,
    input.prompt,
    input.choice.agent,
    input.choice.model,
    input.choice.effort,
    input.choice.fast ? 1 : 0,
  ]
  const referenceValues = [
    input.orgId,
    input.repositoryId,
    input.orgId,
    input.sectionId,
  ]
  const statement = create
    ? db
        .prepare(
          `INSERT INTO routines
      (name, repository_id, section_id, prompt, agent, model, effort, fast, active, inactive_reason,
       failed_runs_in_a_row, time_zone, triggers_json, next_run_at, updated_at, id, org_id, owner_user_id, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE ${activeShellMemberPredicate} AND ${referencesExist}`,
        )
        .bind(
          ...fields,
          input.active ? 1 : 0,
          input.inactiveReason,
          input.failedRunsInARow,
          input.timeZone,
          JSON.stringify(input.triggers),
          input.nextRunAt,
          input.updatedAt,
          input.id,
          input.orgId,
          actorId,
          input.createdAt,
          input.orgId,
          actorId,
          ...referenceValues,
        )
    : db
        .prepare(
          `UPDATE routines SET name = ?, repository_id = ?, section_id = ?, prompt = ?, agent = ?, model = ?, effort = ?, fast = ?,
      active = CASE WHEN ? = 1 THEN ? ELSE active END,
      inactive_reason = CASE WHEN ? = 1 THEN ? ELSE inactive_reason END,
      failed_runs_in_a_row = CASE WHEN ? = 1 AND active = 0 AND ? = 1 THEN 0 ELSE failed_runs_in_a_row END,
      time_zone = ?, triggers_json = ?, next_run_at = CASE WHEN ? = 0 AND active = 0 THEN NULL ELSE ? END, updated_at = ?
      WHERE org_id = ? AND id = ? AND owner_user_id = ? AND ${activeShellMemberPredicate} AND ${referencesExist}`,
        )
        .bind(
          ...fields,
          activeChanged ? 1 : 0,
          input.active ? 1 : 0,
          activeChanged ? 1 : 0,
          input.inactiveReason,
          activeChanged ? 1 : 0,
          input.active ? 1 : 0,
          input.timeZone,
          JSON.stringify(input.triggers),
          activeChanged ? 1 : 0,
          input.nextRunAt,
          input.updatedAt,
          input.orgId,
          input.id,
          actorId,
          input.orgId,
          actorId,
          ...referenceValues,
        )
  const result = await statement.run()
  return result.meta.changes > 0
}

export async function disableRoutine(
  db: D1Database,
  orgId: string,
  id: string,
  actorId: string,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE routines SET active = 0, inactive_reason = CASE WHEN active = 1 THEN NULL ELSE inactive_reason END,
    next_run_at = NULL, updated_at = ? WHERE org_id = ? AND id = ?
    AND ${activeShellMemberPredicate} AND ${ownerOrAdmin}`,
    )
    .bind(now, orgId, id, orgId, actorId, actorId, actorId)
    .run()
  return result.meta.changes > 0
}

export async function deleteRoutine(
  db: D1Database,
  orgId: string,
  id: string,
  actorId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM routines WHERE org_id = ? AND id = ?
    AND ${activeShellMemberPredicate} AND ${ownerOrAdmin}`,
    )
    .bind(orgId, id, orgId, actorId, actorId, actorId)
    .run()
  return result.meta.changes > 0
}
