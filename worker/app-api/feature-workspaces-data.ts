import { activeShellMemberPredicate } from './feature-shell-access'

export async function orderedSectionWorkspaceIds(
  db: D1Database,
  orgId: string,
  sectionId: string,
  exceptId: string,
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT id FROM workspaces WHERE org_id = ? AND section_id = ? AND id != ?
     AND archived_at IS NULL AND state != 'archived' ORDER BY position, created_at, id`,
    )
    .bind(orgId, sectionId, exceptId)
    .all<{ id: string }>()
  return results.map((row) => row.id)
}

export function shellSectionExists(
  db: D1Database,
  orgId: string,
  sectionId: string,
) {
  return db
    .prepare('SELECT id FROM sections WHERE org_id = ? AND id = ?')
    .bind(orgId, sectionId)
    .first<{ id: string }>()
}

export async function updateShellWorkspace(
  db: D1Database,
  input: {
    orgId: string
    userId: string
    workspaceId: string
    sectionId: string
    name?: string
    move: boolean
    order?: readonly string[]
    now: number
  },
): Promise<boolean> {
  const { orgId, userId, workspaceId, sectionId, name, order, now, move } =
    input
  const guard = `org_id = ? AND archived_at IS NULL AND state != 'archived'
    AND ${activeShellMemberPredicate}
    AND EXISTS (SELECT 1 FROM sections WHERE org_id = ? AND id = ?)`
  const statements = [
    db
      .prepare(
        `UPDATE workspaces SET name = COALESCE(?, name), section_id = COALESCE(?, section_id), updated_at = ?
     WHERE id = ? AND ${guard}`,
      )
      .bind(
        name ?? null,
        move ? sectionId : null,
        now,
        workspaceId,
        orgId,
        orgId,
        userId,
        orgId,
        sectionId,
      ),
  ]
  for (const [position, id] of order?.entries() ?? [])
    statements.push(
      db
        .prepare(
          `UPDATE workspaces SET position = ? WHERE id = ? AND ${guard}
          AND EXISTS (SELECT 1 FROM workspaces moving WHERE moving.id = ?
            AND moving.org_id = ? AND moving.archived_at IS NULL AND moving.state != 'archived')`,
        )
        .bind(
          position,
          id,
          orgId,
          orgId,
          userId,
          orgId,
          sectionId,
          workspaceId,
          orgId,
        ),
    )
  const result = await db.batch(statements)
  return result[0].meta.changes > 0
}
