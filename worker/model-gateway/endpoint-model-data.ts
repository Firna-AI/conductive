import type { Agent } from '../../src/shared/generated/Agent'
import type { AgentLoginOwner } from '../chat/queries'
import { activeAdminPredicate } from '../members/org-data'

export interface EndpointModelRead {
  owner: AgentLoginOwner
  agent: Agent
  ciphertext: string
  attemptId: string
  adminId?: string
}

function modelStore(owner: AgentLoginOwner, adminId?: string) {
  if (typeof owner === 'string')
    return {
      table: 'agent_logins',
      key: 'user_id',
      id: owner,
      access: '1',
      values: [],
    }
  return {
    table: 'org_agent_logins',
    key: 'org_id',
    id: owner.orgId,
    access: adminId
      ? activeAdminPredicate
      : `EXISTS (
      SELECT 1 FROM orgs WHERE id = ? AND deleted_at IS NULL AND suspended_at IS NULL
    )`,
    values: adminId ? [owner.orgId, adminId] : [owner.orgId],
  }
}

/** Claim in D1 before fetching, including attempts whose fetch later fails. */
export async function claimEndpointModelRead(
  db: D1Database,
  owner: AgentLoginOwner,
  agent: Agent,
  now: number,
  background: boolean,
  adminId?: string,
): Promise<EndpointModelRead | null> {
  const store = modelStore(owner, adminId)
  const attemptId = crypto.randomUUID()
  const row = await db
    .prepare(
      `UPDATE ${store.table} SET endpoint_models_attempted_at = ?,
       endpoint_models_attempt_id = ? WHERE ${store.key} = ? AND agent = ? AND kind = 'endpoint'
       AND (? = 0 OR endpoint_models_attempted_at IS NULL OR endpoint_models_attempted_at <= ?)
       AND ${store.access}
       RETURNING ciphertext`,
    )
    .bind(
      now,
      attemptId,
      store.id,
      agent,
      background ? 1 : 0,
      now - 600_000,
      ...store.values,
    )
    .first<{ ciphertext: string }>()
  return row
    ? { owner, agent, ciphertext: row.ciphertext, attemptId, adminId }
    : null
}

export async function saveEndpointModels(
  db: D1Database,
  read: EndpointModelRead,
  ids: readonly string[],
  now: number,
): Promise<void> {
  const store = modelStore(read.owner, read.adminId)
  await db
    .prepare(
      `UPDATE ${store.table} SET endpoint_model_ids = ?, endpoint_models_read_at = ?
       WHERE ${store.key} = ? AND agent = ? AND kind = 'endpoint'
       AND ciphertext = ? AND endpoint_models_attempt_id = ? AND ${store.access}`,
    )
    .bind(
      JSON.stringify(ids),
      now,
      store.id,
      read.agent,
      read.ciphertext,
      read.attemptId,
      ...store.values,
    )
    .run()
}
