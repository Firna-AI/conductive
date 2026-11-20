import { activeAdminPredicate } from '../members/org-data'

export async function recordSecretReveal(
  db: D1Database,
  orgId: string,
  secretId: string,
  userId: string,
  now: number,
): Promise<string | null> {
  const row = await db
    .prepare(
      `INSERT INTO org_secret_reveals
       (org_id, secret_id, secret_name, value_version, revealed_by_user_id, revealed_at)
     SELECT org_id, id, name, value_version, ?, ? FROM org_secrets
     WHERE org_id = ? AND id = ? AND ${activeAdminPredicate}
     RETURNING (
       SELECT value_ciphertext FROM org_secrets WHERE org_id = ? AND id = ?
     ) AS ciphertext`,
    )
    .bind(userId, now, orgId, secretId, orgId, userId, orgId, secretId)
    .first<{ ciphertext: string }>()
  return row?.ciphertext ?? null
}
