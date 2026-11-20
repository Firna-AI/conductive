import type { Automation } from '../../src/shared/automations'
import { guardedStatement, shellGuard } from '../app-api/shell-guard'

export function automationCapabilityStatements(
  db: D1Database,
  automation: Automation,
  actorId: string,
) {
  const access = { orgId: automation.orgId, userId: actorId }
  const values = [
    automation.orgId,
    automation.id,
    actorId,
    JSON.stringify(automation.capabilities.preapprovedSecretIds),
    automation.updatedAt,
    automation.repositoryId,
    automation.sectionId,
  ]
  const ownerGuard = `EXISTS (
    SELECT 1 FROM automations r
    JOIN repositories p ON p.org_id = r.org_id AND p.id = r.repository_id AND p.selected = 1
    JOIN sections c ON c.org_id = r.org_id AND c.id = r.section_id
    WHERE r.org_id = ?1 AND r.id = ?2 AND r.owner_user_id = ?3
      AND r.repository_id = ?6 AND r.section_id = ?7
  )`
  return [
    guardedStatement(
      db,
      access,
      `DELETE FROM automation_secret_preapprovals WHERE org_id = ?1 AND automation_id = ?2
       AND secret_id NOT IN (SELECT value FROM json_each(?4))
       AND ${ownerGuard} AND ${shellGuard}`,
      values,
    ),
    guardedStatement(
      db,
      access,
      `INSERT OR IGNORE INTO automation_secret_preapprovals
       (org_id, automation_id, secret_id, approved_by_user_id, approved_at)
       SELECT org_id, ?2, id, ?3, ?5 FROM org_secrets
       WHERE org_id = ?1 AND id IN (SELECT value FROM json_each(?4))
       AND ${ownerGuard} AND ${shellGuard}`,
      values,
    ),
  ]
}
