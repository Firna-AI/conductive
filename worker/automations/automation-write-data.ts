import type { Automation } from '../../src/shared/automations'
import {
  guardedBatch,
  guardedRun,
  guardedStatement,
  shellGuard,
} from '../app-api/shell-guard'
import { automationCapabilityStatements } from './automation-capability-statements'

function referencesExist(orgBinding: number): string {
  return `EXISTS (SELECT 1 FROM repositories WHERE org_id = ?${orgBinding} AND id = ?2 AND selected = 1)
    AND EXISTS (SELECT 1 FROM sections WHERE org_id = ?${orgBinding} AND id = ?3)`
}

function ownerOrAdmin(actorBinding: number): string {
  return `(owner_user_id = ?${actorBinding} OR EXISTS (
    SELECT 1 FROM org_members WHERE org_id = automations.org_id AND user_id = ?${actorBinding} AND role = 'admin'
  ))`
}

export async function saveAutomation(
  db: D1Database,
  input: Automation,
  actorId: string,
  create: boolean,
  activeChanged = false,
  capabilitiesChanged = false,
): Promise<boolean> {
  const access = { orgId: input.orgId, userId: actorId }
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
  const statement = create
    ? guardedStatement(
        db,
        access,
        `INSERT INTO automations
         (name, repository_id, section_id, prompt, agent, model, effort, fast, active, inactive_reason,
          failed_runs_in_a_row, time_zone, triggers_json, next_run_at, updated_at, id, org_id, owner_user_id, created_at)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19
         WHERE ${shellGuard} AND ${referencesExist(17)}`,
        [
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
        ],
      )
    : guardedStatement(
        db,
        access,
        `UPDATE automations SET name = ?1, repository_id = ?2, section_id = ?3, prompt = ?4,
         agent = ?5, model = ?6, effort = ?7, fast = ?8,
         active = CASE WHEN ?9 = 1 THEN ?10 ELSE active END,
         inactive_reason = CASE WHEN ?9 = 1 THEN ?11 ELSE inactive_reason END,
         failed_runs_in_a_row = CASE WHEN ?9 = 1 AND active = 0 AND ?10 = 1 THEN 0 ELSE failed_runs_in_a_row END,
         time_zone = ?12, triggers_json = ?13,
         next_run_at = CASE WHEN ?9 = 0 AND active = 0 THEN NULL ELSE ?14 END, updated_at = ?15
         WHERE org_id = ?16 AND id = ?17 AND owner_user_id = ?18
           AND ${shellGuard} AND ${referencesExist(16)}`,
        [
          ...fields,
          activeChanged ? 1 : 0,
          input.active ? 1 : 0,
          input.inactiveReason,
          input.timeZone,
          JSON.stringify(input.triggers),
          input.nextRunAt,
          input.updatedAt,
          input.orgId,
          input.id,
          actorId,
        ],
      )
  const [result] = await guardedBatch(db, [
    statement,
    ...(create || capabilitiesChanged
      ? automationCapabilityStatements(db, input, actorId)
      : []),
  ])
  return result.meta.changes > 0
}

export async function disableAutomation(
  db: D1Database,
  orgId: string,
  id: string,
  actorId: string,
  now: number,
): Promise<boolean> {
  const result = await guardedRun(
    guardedStatement(
      db,
      { orgId, userId: actorId },
      `UPDATE automations SET active = 0, inactive_reason = CASE WHEN active = 1 THEN NULL ELSE inactive_reason END,
       next_run_at = NULL, updated_at = ?1 WHERE org_id = ?2 AND id = ?3
       AND ${shellGuard} AND ${ownerOrAdmin(4)}`,
      [now, orgId, id, actorId],
    ),
  )
  return result.meta.changes > 0
}

export async function deleteAutomation(
  db: D1Database,
  orgId: string,
  id: string,
  actorId: string,
): Promise<boolean> {
  const result = await guardedRun(
    guardedStatement(
      db,
      { orgId, userId: actorId },
      `DELETE FROM automations WHERE org_id = ?1 AND id = ?2
       AND ${shellGuard} AND ${ownerOrAdmin(3)}`,
      [orgId, id, actorId],
    ),
  )
  return result.meta.changes > 0
}
