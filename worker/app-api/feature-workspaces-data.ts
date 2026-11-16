import {
  placeWorkspaces,
  type TreeWorkspace,
} from '../../src/shared/workspace-tree'
import { activeShellMemberPredicate } from './feature-shell-access'
import { shellSections } from './shell-data'

export async function readWorkspaceTree(db: D1Database, orgId: string) {
  const [workspaces, sections] = await Promise.all([
    db
      .prepare(
        `SELECT id, number, parent_workspace_id AS parentId, section_id AS sectionId,
       CASE WHEN archived_at IS NOT NULL THEN 'archived' ELSE state END AS state,
       created_at AS createdAt FROM workspaces WHERE org_id = ? ORDER BY position, created_at, id`,
      )
      .bind(orgId)
      .all<TreeWorkspace & { number: number }>(),
    shellSections(db, orgId, ''),
  ])
  return {
    workspaces: workspaces.results,
    sections,
    rows: placeWorkspaces(workspaces.results, sections),
  }
}

export async function readWorkspaceMove(
  db: D1Database,
  orgId: string,
  workspaceId: string,
) {
  const { workspaces, sections, rows } = await readWorkspaceTree(db, orgId)
  const placement = rows.find(({ workspace }) => workspace.id === workspaceId)
  let root = placement
  while (root?.parentId)
    root = rows.find(({ workspace }) => workspace.id === root?.parentId)
  const workspaceIds = new Set([workspaceId])
  // Include archived descendants by placing the stored tree with every row live.
  for (const row of placeWorkspaces(
    workspaces.map((workspace) => ({ ...workspace, state: 'ready' as const })),
    sections,
  ))
    if (row.parentId !== null && workspaceIds.has(row.parentId))
      workspaceIds.add(row.workspace.id)
  return {
    root: root?.workspace,
    nested: placement !== undefined && placement.parentId !== null,
    workspaceIds: [...workspaceIds],
    topLevelIds: rows
      .filter(({ parentId }) => parentId === null)
      .map(({ workspace }) => workspace.id),
  }
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
    sectionId?: string
    name?: string
    position?: number
    now: number
  },
  movement?: Awaited<ReturnType<typeof readWorkspaceMove>>,
): Promise<boolean> {
  const { orgId, userId, workspaceId, name, now } = input
  let { sectionId, position } = input
  const move =
    movement ??
    (sectionId !== undefined || position !== undefined
      ? await readWorkspaceMove(db, orgId, workspaceId)
      : undefined)
  if (move?.nested) {
    if (name === undefined) return true
    sectionId = undefined
    position = undefined
  }
  const guard = `org_id = ? AND archived_at IS NULL AND state != 'archived'
    AND ${activeShellMemberPredicate}
    AND EXISTS (SELECT 1 FROM sections WHERE org_id = ? AND id = COALESCE(?, workspaces.section_id))`
  const statements = [
    db
      .prepare(
        `UPDATE workspaces SET name = COALESCE(?, name), section_id = COALESCE(?, section_id), updated_at = MAX(updated_at, ?)
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
           SELECT section_id FROM workspaces WHERE id = ? AND ${guard}
         ) UPDATE workspaces SET section_id = (SELECT section_id FROM moving), updated_at = MAX(updated_at, ?)
         WHERE org_id = ? AND id != ? AND id IN (SELECT value FROM json_each(?))
           AND EXISTS (SELECT 1 FROM moving)`,
        )
        .bind(
          workspaceId,
          orgId,
          orgId,
          userId,
          orgId,
          sectionId ?? null,
          now,
          orgId,
          workspaceId,
          JSON.stringify(move?.workspaceIds ?? []),
        ),
      db
        .prepare(
          `WITH moving AS MATERIALIZED (
             SELECT id, section_id FROM workspaces WHERE id = ? AND ${guard}
           ), siblings AS MATERIALIZED (
             SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at, id) - 1 AS rank
             FROM workspaces WHERE org_id = ? AND section_id = (SELECT section_id FROM moving)
               AND id != ? AND archived_at IS NULL AND state != 'archived'
               AND id IN (SELECT value FROM json_each(?))
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
          JSON.stringify(move?.topLevelIds ?? []),
          position ?? 0,
          orgId,
        ),
    )
  const result = await db.batch(statements)
  return result[0].meta.changes > 0
}
