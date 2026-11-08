import { lastAdminError } from './membership'

/** Account deletion must keep this predicate on its final mutation in the same batch. */
export const accountDeletionAllowedPredicate = `NOT EXISTS (
  SELECT 1 FROM org_members own JOIN orgs o ON o.id = own.org_id
  WHERE own.user_id = ? AND own.role = 'admin' AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM org_members other
    WHERE other.org_id = own.org_id AND other.role = 'admin' AND other.user_id <> own.user_id)
)`

export async function assertCanDeleteAccount(
  db: D1Database,
  userId: string,
): Promise<void> {
  if (!(await accountDeletionAllowed(db, userId))) throw lastAdminError()
}

async function accountDeletionAllowed(db: D1Database, userId: string) {
  const row = await db
    .prepare(`SELECT 1 AS allowed WHERE ${accountDeletionAllowedPredicate}`)
    .bind(userId)
    .first<{ allowed: number }>()
  return row !== null
}
