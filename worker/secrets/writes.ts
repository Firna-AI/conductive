import { activeAdminPredicate } from '../members/org-data'
import { secretEditorPredicate, secretMemberPredicate } from './access'
import { requireSecretName } from './names'

export async function insertSecret(
  db: D1Database,
  input: {
    orgId: string
    id: string
    userId: string
    name: string
    description: string
    ciphertext: string
    allAgents: boolean
    now: number
  },
): Promise<boolean> {
  requireSecretName(input.name)
  const row = await db
    .prepare(
      `INSERT INTO org_secrets (id, org_id, name, description, value_ciphertext,
       created_by_user_id, all_agents, created_at, updated_at)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${input.allAgents ? activeAdminPredicate : secretMemberPredicate}
     ON CONFLICT (org_id, name) DO NOTHING RETURNING id`,
    )
    .bind(
      input.id,
      input.orgId,
      input.name,
      input.description,
      input.ciphertext,
      input.userId,
      Number(input.allAgents),
      input.now,
      input.now,
      input.orgId,
      input.userId,
    )
    .first<{ id: string }>()
  return row !== null
}

export async function replaceSecret(
  db: D1Database,
  input: {
    orgId: string
    id: string
    userId: string
    description?: string
    ciphertext?: string
    now: number
  },
): Promise<boolean> {
  const row = await db
    .prepare(
      `UPDATE org_secrets SET description = COALESCE(?, description),
       value_ciphertext = COALESCE(?, value_ciphertext),
       value_version = value_version + CASE WHEN ? IS NULL THEN 0 ELSE 1 END, updated_at = ?
     WHERE org_id = ? AND id = ? AND ${secretEditorPredicate} RETURNING id`,
    )
    .bind(
      input.description ?? null,
      input.ciphertext ?? null,
      input.ciphertext ?? null,
      input.now,
      input.orgId,
      input.id,
      input.orgId,
      input.userId,
    )
    .first<{ id: string }>()
  return row !== null
}

export async function deleteSecret(
  db: D1Database,
  orgId: string,
  id: string,
  userId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `DELETE FROM org_secrets WHERE org_id = ? AND id = ? AND ${secretEditorPredicate} RETURNING id`,
    )
    .bind(orgId, id, orgId, userId)
    .first<{ id: string }>()
  return row !== null
}

export async function setSecretAllAgents(
  db: D1Database,
  orgId: string,
  id: string,
  userId: string,
  allAgents: boolean,
  now: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      `UPDATE org_secrets SET all_agents = ?, updated_at = ?
     WHERE org_id = ? AND id = ? AND ${activeAdminPredicate} RETURNING id`,
    )
    .bind(Number(allAgents), now, orgId, id, orgId, userId)
    .first<{ id: string }>()
  return row !== null
}
