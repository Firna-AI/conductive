import { activeShellMemberPredicate } from './feature-shell-access'

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
  const insert = db
    .prepare(
      `INSERT INTO sections (id, org_id, name, position, created_at)
     SELECT ?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM sections WHERE org_id = ?), ?
     WHERE ${activeShellMemberPredicate} RETURNING id`,
    )
    .bind(
      input.id,
      input.orgId,
      input.name,
      input.orgId,
      input.now,
      input.orgId,
      input.userId,
    )
  if (input.afterSectionId === undefined) return insert.first<{ id: string }>()
  const [inserted] = await db.batch<{ id: string }>([
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
): D1PreparedStatement {
  const { orgId, userId, sectionId, to } = input
  const destination =
    'index' in to
      ? 'SELECT MIN(?, COUNT(*)) AS position FROM siblings'
      : `SELECT COALESCE((SELECT rank + 1 FROM siblings WHERE id = ?), COUNT(*))
               AS position FROM siblings`
  return db
    .prepare(
      `WITH siblings AS MATERIALIZED (
             SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) - 1 AS rank
             FROM sections WHERE org_id = ? AND id != ?
           ), destination AS MATERIALIZED (
             ${destination}
           ), ranks AS MATERIALIZED (
             SELECT siblings.id, rank + CASE WHEN rank >= destination.position THEN 1 ELSE 0 END AS position
             FROM siblings CROSS JOIN destination
             UNION ALL SELECT ?, position FROM destination
           ) UPDATE sections SET position = (
             SELECT ranks.position FROM ranks WHERE ranks.id = sections.id
           ) WHERE org_id = ? AND ${activeShellMemberPredicate} AND id IN (SELECT id FROM ranks)
             AND EXISTS (SELECT 1 FROM sections target WHERE target.id = ? AND target.org_id = ?)`,
    )
    .bind(
      orgId,
      sectionId,
      'index' in to ? to.index : to.after,
      sectionId,
      orgId,
      orgId,
      userId,
      sectionId,
      orgId,
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
  const guard = `org_id = ? AND ${activeShellMemberPredicate}`
  const statements = [
    db
      .prepare(
        `UPDATE sections SET name = COALESCE(?, name) WHERE id = ? AND ${guard}`,
      )
      .bind(name ?? null, sectionId, orgId, orgId, userId),
  ]
  if (collapsed !== undefined)
    statements.push(
      db
        .prepare(
          `INSERT INTO section_preferences (org_id, section_id, user_id, collapsed)
     SELECT ?, ?, ?, ? WHERE ${activeShellMemberPredicate}
       AND EXISTS (SELECT 1 FROM sections WHERE id = ? AND org_id = ?)
     ON CONFLICT(section_id, user_id) DO UPDATE SET collapsed = excluded.collapsed
       WHERE ${activeShellMemberPredicate}`,
        )
        .bind(
          orgId,
          sectionId,
          userId,
          collapsed ? 1 : 0,
          orgId,
          userId,
          sectionId,
          orgId,
          orgId,
          userId,
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
  const result = await db.batch(statements)
  return result[0].meta.changes > 0
}

export async function deleteShellSection(
  db: D1Database,
  input: { orgId: string; userId: string; sectionId: string; now: number },
): Promise<{ deleted: boolean; workspaceIds: string[] }> {
  const { orgId, userId, sectionId, now } = input
  const sectionExists =
    'EXISTS (SELECT 1 FROM sections WHERE id = ? AND org_id = ? AND is_default = 0)'
  const moved = await db.batch<{ id: string }>([
    db
      .prepare(
        `WITH moved AS MATERIALIZED (
           SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at, id) - 1 AS offset
           FROM workspaces WHERE org_id = ? AND section_id = ?
         ), target AS MATERIALIZED (
           SELECT COALESCE(MAX(w.position) + 1, 0) AS next
           FROM workspaces w JOIN sections s ON s.id = w.section_id
           WHERE w.org_id = ? AND s.is_default = 1
         ) UPDATE workspaces SET
         section_id = (SELECT id FROM sections WHERE org_id = ? AND is_default = 1),
         position = (SELECT next FROM target) + (SELECT offset FROM moved WHERE moved.id = workspaces.id),
         updated_at = MAX(updated_at, ?)
       WHERE org_id = ? AND section_id = ? AND ${activeShellMemberPredicate}
         AND ${sectionExists} RETURNING id`,
      )
      .bind(
        orgId,
        sectionId,
        orgId,
        orgId,
        now,
        orgId,
        sectionId,
        orgId,
        userId,
        sectionId,
        orgId,
      ),
    db
      .prepare(
        `UPDATE automations SET
         section_id = (SELECT id FROM sections WHERE org_id = ? AND is_default = 1),
         updated_at = ?
       WHERE org_id = ? AND section_id = ? AND ${activeShellMemberPredicate}
         AND ${sectionExists}`,
      )
      .bind(orgId, now, orgId, sectionId, orgId, userId, sectionId, orgId),
    db
      .prepare(
        `DELETE FROM sections WHERE id = ? AND org_id = ? AND is_default = 0
       AND ${activeShellMemberPredicate}`,
      )
      .bind(sectionId, orgId, orgId, userId),
    db
      .prepare(
        `WITH ranks AS MATERIALIZED (
           SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) - 1 AS position
           FROM sections WHERE org_id = ?
         ) UPDATE sections SET position = (
           SELECT ranks.position FROM ranks WHERE ranks.id = sections.id
         )
       WHERE org_id = ? AND ${activeShellMemberPredicate}`,
      )
      .bind(orgId, orgId, orgId, userId),
  ])
  return {
    deleted: moved[2].meta.changes > 0,
    workspaceIds: moved[0].results.map((row) => row.id),
  }
}
