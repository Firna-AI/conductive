import { activeWorkspaceOwnerPredicate } from '../data/sandbox-access'

export const importActivationGuard = `w.archived_at IS NULL AND w.activation_completed_at IS NULL
  AND w.conductor_local_id IS NOT NULL AND ${activeWorkspaceOwnerPredicate}
  AND EXISTS (SELECT 1 FROM org_members m JOIN users u ON u.id = m.user_id
    WHERE m.org_id = w.org_id AND m.user_id = ? AND u.suspended_at IS NULL)`

export async function unfinishedImport(db: D1Database, workspaceId: string) {
  return Boolean(
    await db
      .prepare(
        'SELECT 1 FROM workspaces WHERE id = ? AND conductor_local_id IS NOT NULL AND activation_completed_at IS NULL',
      )
      .bind(workspaceId)
      .first(),
  )
}

export async function importPreparedForDispatch(
  db: D1Database,
  workspaceId: string,
  prepared: boolean,
) {
  const row = await db
    .prepare(
      'SELECT conductor_local_id AS sourceId, activation_completed_at AS activatedAt FROM workspaces WHERE id = ?',
    )
    .bind(workspaceId)
    .first<{ sourceId: string | null; activatedAt: number | null }>()
  return Boolean(
    row && (row.sourceId === null || (row.activatedAt !== null && prepared)),
  )
}
