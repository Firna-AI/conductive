import {
  guardedBatch,
  guardedStatement,
  shellGuard,
  type GuardedStatement,
} from './shell-guard'

/**
 * Adds a section at the end of the list, or directly below
 * `afterSectionId` when it is given. A section of that ID that is gone
 * puts it at the end. The insert and the move run in one batch, and the
 * move finds the place from the current rows, so the section never shows
 * in another place.
 */
export async function insertShellSection(
  db: D1Database,
  input: {
    id: string
    orgId: string
    userId: string
    name: string
    now: number
    afterSectionId?: string
  },
): Promise<{ id: string } | null> {
  const insert = guardedStatement(
    db,
    input,
    `INSERT INTO sections (id, org_id, name, position, created_at)
     SELECT ?1, ?2, ?3, (SELECT COALESCE(MAX(position) + 1, 0) FROM sections WHERE org_id = ?2), ?4
     WHERE ${shellGuard} RETURNING id`,
    [input.id, input.orgId, input.name, input.now],
  )
  if (input.afterSectionId === undefined) return insert.first<{ id: string }>()
  const [inserted] = await guardedBatch<{ id: string }>(db, [
    insert,
    sectionMoveStatement(db, {
      orgId: input.orgId,
      userId: input.userId,
      sectionId: input.id,
      to: { after: input.afterSectionId },
    }),
  ])
  return inserted?.results[0] ?? null
}

/**
 * Moves a section to `index` of the list, which counts the sections
 * without the moved one, or directly below the section `after`. An `after`
 * that is gone moves it to the end. Each section then has its index as its
 * position.
 */
function sectionMoveStatement(
  db: D1Database,
  input: {
    orgId: string
    userId: string
    sectionId: string
    to: { index: number } | { after: string }
  },
): GuardedStatement {
  const { orgId, sectionId, to } = input
  const destination =
    'index' in to
      ? 'SELECT MIN(?3, COUNT(*)) AS position FROM siblings'
      : `SELECT COALESCE((SELECT rank + 1 FROM siblings WHERE id = ?3), COUNT(*))
               AS position FROM siblings`
  return guardedStatement(
    db,
    input,
    `WITH siblings AS MATERIALIZED (
       SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) - 1 AS rank
       FROM sections WHERE org_id = ?1 AND id != ?2
     ), destination AS MATERIALIZED (
       ${destination}
     ), ranks AS MATERIALIZED (
       SELECT siblings.id, rank + CASE WHEN rank >= destination.position THEN 1 ELSE 0 END AS position
       FROM siblings CROSS JOIN destination
       UNION ALL SELECT ?2, position FROM destination
     ) UPDATE sections SET position = (
       SELECT ranks.position FROM ranks WHERE ranks.id = sections.id
     ) WHERE org_id = ?1 AND ${shellGuard} AND id IN (SELECT id FROM ranks)
       AND EXISTS (SELECT 1 FROM sections target WHERE target.id = ?2 AND target.org_id = ?1)`,
    [orgId, sectionId, 'index' in to ? to.index : to.after],
  )
}

export async function updateShellSection(
  db: D1Database,
  input: {
    orgId: string
    userId: string
    sectionId: string
    name?: string
    collapsed?: boolean
    position?: number
  },
): Promise<boolean> {
  const { orgId, userId, sectionId, name, collapsed, position } = input
  const statements = [
    guardedStatement(
      db,
      input,
      `UPDATE sections SET name = COALESCE(?1, name)
       WHERE id = ?2 AND org_id = ?3 AND ${shellGuard}`,
      [name ?? null, sectionId, orgId],
    ),
  ]
  if (collapsed !== undefined)
    statements.push(
      guardedStatement(
        db,
        input,
        `INSERT INTO section_preferences (org_id, section_id, user_id, collapsed)
         SELECT ?1, ?2, ?3, ?4 WHERE ${shellGuard}
           AND EXISTS (SELECT 1 FROM sections WHERE id = ?2 AND org_id = ?1)
         ON CONFLICT(section_id, user_id) DO UPDATE SET collapsed = excluded.collapsed
           WHERE ${shellGuard}`,
        [orgId, sectionId, userId, collapsed ? 1 : 0],
      ),
    )
  if (position !== undefined)
    statements.push(
      sectionMoveStatement(db, {
        orgId,
        userId,
        sectionId,
        to: { index: position },
      }),
    )
  const result = await guardedBatch(db, statements)
  return result[0].meta.changes > 0
}

export async function deleteShellSection(
  db: D1Database,
  input: { orgId: string; userId: string; sectionId: string; now: number },
): Promise<{ deleted: boolean; workspaceIds: string[] }> {
  const { orgId, sectionId, now } = input
  const sectionExists =
    'EXISTS (SELECT 1 FROM sections WHERE id = ?2 AND org_id = ?1 AND is_default = 0)'
  const moved = await guardedBatch<{ id: string }>(db, [
    guardedStatement(
      db,
      input,
      `WITH moved AS MATERIALIZED (
         SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at, id) - 1 AS offset
         FROM workspaces WHERE org_id = ?1 AND section_id = ?2
       ), target AS MATERIALIZED (
         SELECT COALESCE(MAX(w.position) + 1, 0) AS next
         FROM workspaces w JOIN sections s ON s.id = w.section_id
         WHERE w.org_id = ?1 AND s.is_default = 1
       ) UPDATE workspaces SET
       section_id = (SELECT id FROM sections WHERE org_id = ?1 AND is_default = 1),
       position = (SELECT next FROM target) + (SELECT offset FROM moved WHERE moved.id = workspaces.id),
       updated_at = MAX(updated_at, ?3)
       WHERE org_id = ?1 AND section_id = ?2 AND ${shellGuard}
         AND ${sectionExists} RETURNING id`,
      [orgId, sectionId, now],
    ),
    guardedStatement(
      db,
      input,
      `UPDATE automations SET
       section_id = (SELECT id FROM sections WHERE org_id = ?1 AND is_default = 1),
       updated_at = ?3
       WHERE org_id = ?1 AND section_id = ?2 AND ${shellGuard}
         AND ${sectionExists}`,
      [orgId, sectionId, now],
    ),
    guardedStatement(
      db,
      input,
      `DELETE FROM sections WHERE id = ?2 AND org_id = ?1 AND is_default = 0
       AND ${shellGuard}`,
      [orgId, sectionId],
    ),
    guardedStatement(
      db,
      input,
      `WITH ranks AS MATERIALIZED (
         SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) - 1 AS position
         FROM sections WHERE org_id = ?1
       ) UPDATE sections SET position = (
         SELECT ranks.position FROM ranks WHERE ranks.id = sections.id
       ) WHERE org_id = ?1 AND ${shellGuard}`,
      [orgId],
    ),
  ])
  return {
    deleted: moved[2].meta.changes > 0,
    workspaceIds: moved[0].results.map((row) => row.id),
  }
}
