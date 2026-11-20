import type { Agent } from '../../src/shared/generated/Agent'
import type { SaveOrgAgentLoginRequest } from '../../src/shared/org-agent-logins'
import { activeAdminPredicate } from '../members/org-data'

export async function saveOrgAgentLogin(
  db: D1Database,
  input: {
    orgId: string
    userId: string
    agent: Agent
    kind: SaveOrgAgentLoginRequest['kind']
    ciphertext: string
    now: number
    origin: string | null
    models: readonly string[] | null
    modelReadAttempted: boolean
  },
): Promise<boolean> {
  const { orgId, userId, now, models } = input
  const result = await db
    .prepare(
      `INSERT INTO org_agent_logins (org_id, agent, kind, ciphertext, endpoint_origin,
       created_by, created_at, updated_at, endpoint_model_ids, endpoint_models_read_at,
       endpoint_models_attempted_at, endpoint_models_attempt_id)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${activeAdminPredicate}
       ON CONFLICT(org_id, agent) DO UPDATE SET
       kind = excluded.kind, ciphertext = excluded.ciphertext,
       endpoint_origin = excluded.endpoint_origin, updated_at = excluded.updated_at,
       endpoint_model_ids = excluded.endpoint_model_ids,
       endpoint_models_read_at = excluded.endpoint_models_read_at,
       endpoint_models_attempted_at = excluded.endpoint_models_attempted_at,
       endpoint_models_attempt_id = excluded.endpoint_models_attempt_id`,
    )
    .bind(
      orgId,
      input.agent,
      input.kind,
      input.ciphertext,
      input.origin,
      userId,
      now,
      now,
      models === null ? null : JSON.stringify(models),
      models === null ? null : now,
      input.modelReadAttempted ? now : null,
      input.modelReadAttempted ? crypto.randomUUID() : null,
      orgId,
      userId,
    )
    .run()
  return result.meta.changes > 0
}

export async function updateOrgAgentLogin(
  db: D1Database,
  orgId: string,
  userId: string,
  agent: Agent,
  useForEveryMember: boolean,
): Promise<void> {
  await db
    .prepare(
      `UPDATE org_agent_logins SET use_for_every_member = ?
       WHERE org_id = ? AND agent = ? AND ${activeAdminPredicate}`,
    )
    .bind(useForEveryMember ? 1 : 0, orgId, agent, orgId, userId)
    .run()
}

export async function removeOrgAgentLogin(
  db: D1Database,
  orgId: string,
  userId: string,
  agent: Agent,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM org_agent_logins WHERE org_id = ? AND agent = ?
       AND ${activeAdminPredicate}`,
    )
    .bind(orgId, agent, orgId, userId)
    .run()
}
