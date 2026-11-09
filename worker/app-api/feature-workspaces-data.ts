import { activeShellMemberPredicate } from './feature-shell-access'

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
    sectionId?: string
    name?: string
    position?: number
    now: number
  },
): Promise<boolean> {
  const { orgId, userId, workspaceId, sectionId, name, position, now } = input
  const guard = `org_id = ? AND archived_at IS NULL AND state != 'archived'
    AND ${activeShellMemberPredicate}
    AND EXISTS (SELECT 1 FROM sections WHERE org_id = ? AND id = COALESCE(?, workspaces.section_id))`
  const statements = [
    db
      .prepare(
        `UPDATE workspaces SET name = COALESCE(?, name), section_id = COALESCE(?, section_id), updated_at = ?
     WHERE id = ? AND ${guard}`,
      )
      .bind(
        name ?? null,
        sectionId ?? null,
        now,
        workspaceId,
        orgId,
        orgId,
        userId,
        orgId,
        sectionId ?? null,
      ),
  ]
  if (sectionId !== undefined || position !== undefined)
    statements.push(
      db
        .prepare(
          `WITH moving AS MATERIALIZED (
             SELECT id, section_id FROM workspaces WHERE id = ? AND ${guard}
           ), siblings AS MATERIALIZED (
             SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at, id) - 1 AS rank
             FROM workspaces WHERE org_id = ? AND section_id = (SELECT section_id FROM moving)
               AND id != ? AND archived_at IS NULL AND state != 'archived'
           ), destination AS MATERIALIZED (
             SELECT MIN(?, COUNT(*)) AS position FROM siblings
           ), ranks AS MATERIALIZED (
             SELECT siblings.id, rank + CASE WHEN rank >= destination.position THEN 1 ELSE 0 END AS position
             FROM siblings CROSS JOIN destination
             UNION ALL SELECT moving.id, destination.position FROM moving CROSS JOIN destination
           ) UPDATE workspaces SET position = (
             SELECT ranks.position FROM ranks WHERE ranks.id = workspaces.id
           ) WHERE org_id = ? AND section_id = (SELECT section_id FROM moving)
             AND id IN (SELECT id FROM ranks)`,
        )
        .bind(
          workspaceId,
          orgId,
          orgId,
          userId,
          orgId,
          sectionId ?? null,
          orgId,
          workspaceId,
          position ?? 0,
          orgId,
        ),
    )
  const result = await db.batch(statements)
  return result[0].meta.changes > 0
}
