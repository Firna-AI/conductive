import {
  placeWorkspaces,
  type TreeWorkspace,
} from '../../src/shared/workspace-tree'
import { namedBranchSql } from '../lifecycle/workspace-branch'
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
  const { rows } = await readWorkspaceTree(db, orgId)
  const placement = rows.find(({ workspace }) => workspace.id === workspaceId)
  let root = placement
  while (root?.parentId)
    root = rows.find(({ workspace }) => workspace.id === root?.parentId)
  return {
    root: root?.workspace,
    nested: placement !== undefined && placement.parentId !== null,
  }
}

export const workspaceTreeSql = `WITH RECURSIVE tree_rows AS MATERIALIZED (
  SELECT w.*, archived_at IS NULL AND state != 'archived' AS live,
    COALESCE(
      (SELECT id FROM sections WHERE org_id = ?1 AND id = w.section_id),
      (SELECT id FROM sections WHERE org_id = ?1 ORDER BY is_default DESC, position LIMIT 1),
      section_id) AS shown_section_id
  FROM workspaces w WHERE org_id = ?1
), ancestors(id, ancestor_id) AS (
  SELECT id, parent_workspace_id FROM tree_rows WHERE parent_workspace_id IS NOT NULL
  UNION ALL
  SELECT a.id, p.parent_workspace_id FROM ancestors a
  JOIN tree_rows p ON p.id = a.ancestor_id WHERE p.parent_workspace_id IS NOT NULL
), top_level AS MATERIALIZED (
  SELECT w.* FROM tree_rows w WHERE live AND NOT EXISTS (
    SELECT 1 FROM ancestors a JOIN tree_rows p ON p.id = a.ancestor_id
    WHERE a.id = w.id AND p.live
  )
), subtree(id) AS (
  SELECT id FROM tree_rows WHERE id = ?2
  UNION ALL
  SELECT w.id FROM tree_rows w JOIN subtree t ON w.parent_workspace_id = t.id
), promotion_path(id, live) AS (
  SELECT id, live FROM tree_rows WHERE parent_workspace_id = ?2
  UNION ALL
  SELECT w.id, w.live FROM tree_rows w
  JOIN promotion_path p ON w.parent_workspace_id = p.id WHERE NOT p.live
), promoted AS MATERIALIZED (
  SELECT id FROM promotion_path WHERE live
)`

type TreeWrite = {
  orgId: string
  workspaceId: string
} & (
  | { kind: 'archive' }
  | {
      kind: 'move'
      userId: string
      sectionId?: string
      position?: number
      keepCurrentSection?: boolean
      now: number
    }
)

export async function writeWorkspaceTree(
  db: D1Database,
  operation: TreeWrite,
  first: D1PreparedStatement,
  last: D1PreparedStatement[] = [],
) {
  const { orgId, workspaceId } = operation
  const statements: D1PreparedStatement[] = []
  if (operation.kind === 'archive') {
    statements.push(
      db
        .prepare(
          `${workspaceTreeSql}, archive_place AS MATERIALIZED (
             SELECT section_id, position, MAX(0, (SELECT COUNT(*) FROM promoted) - 1) AS shift
             FROM tree_rows WHERE id = ?2
           ), promoted_places AS MATERIALIZED (
             SELECT w.id, p.position + ROW_NUMBER() OVER (ORDER BY w.created_at, w.id) - 1 AS position
             FROM tree_rows w JOIN promoted ON promoted.id = w.id CROSS JOIN archive_place p
           ) UPDATE workspaces SET
           section_id = CASE WHEN id IN (SELECT id FROM promoted_places)
             THEN (SELECT section_id FROM archive_place) ELSE section_id END,
           position = COALESCE(
             (SELECT position FROM promoted_places WHERE id = workspaces.id),
             position + (SELECT shift FROM archive_place)
           ) WHERE changes() > 0 AND org_id = ?1 AND (
             id IN (SELECT id FROM promoted_places) OR (
               section_id = (SELECT section_id FROM archive_place)
               AND position > (SELECT position FROM archive_place)
               AND (SELECT shift FROM archive_place) > 0
             )
           )
           RETURNING id`,
        )
        .bind(orgId, workspaceId),
    )
  } else {
    const moving = `${workspaceTreeSql}, moving AS MATERIALIZED (
      SELECT id, COALESCE(?3, section_id) AS destination FROM top_level
      WHERE id = ?2 AND (?4 = 0 OR section_id != ?3)
        AND ${activeShellMemberPredicate}
        AND EXISTS (SELECT 1 FROM sections WHERE org_id = ?1 AND id = COALESCE(?3, section_id))
    )`
    const bindings = [
      orgId,
      workspaceId,
      operation.sectionId ?? null,
      operation.keepCurrentSection ? 1 : 0,
      orgId,
      operation.userId,
    ]
    statements.push(
      db
        .prepare(
          `${moving}, siblings AS MATERIALIZED (
             SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at, id) - 1 AS rank
             FROM top_level WHERE shown_section_id = (SELECT destination FROM moving) AND id != ?2
           ), destination AS MATERIALIZED (
             SELECT MIN(?, COUNT(*)) AS position FROM siblings
           ), ranks AS MATERIALIZED (
             SELECT siblings.id, rank + (rank >= destination.position) AS position
             FROM siblings CROSS JOIN destination
             UNION ALL SELECT moving.id, destination.position FROM moving CROSS JOIN destination
           ) UPDATE workspaces SET position = (
             SELECT ranks.position FROM ranks WHERE ranks.id = workspaces.id
           ) WHERE org_id = ?1 AND id IN (SELECT id FROM ranks) AND EXISTS (SELECT 1 FROM moving)`,
        )
        .bind(...bindings, operation.position ?? 0),
      db
        .prepare(
          `${moving} UPDATE workspaces SET
           section_id = (SELECT destination FROM moving), updated_at = MAX(updated_at, ?)
           WHERE org_id = ?1 AND id IN (SELECT id FROM subtree) AND EXISTS (SELECT 1 FROM moving)
           RETURNING id`,
        )
        .bind(...bindings, operation.now),
    )
  }
  const result = await db.batch<{ id: string; changed?: number }>([
    first,
    ...statements,
    ...last,
  ])
  return {
    updated: result[0].meta.changes > 0,
    workspaceIds: [
      ...new Set(
        result.flatMap(({ results }) =>
          results.filter(({ changed }) => changed !== 0).map(({ id }) => id),
        ),
      ),
    ],
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
    keepCurrentSection?: boolean
    now: number
  },
) {
  const { orgId, userId, workspaceId, name, now, sectionId, position } = input
  const moving = sectionId !== undefined || position !== undefined
  const guard = `org_id = ?1 AND archived_at IS NULL AND state != 'archived'
    AND ${activeShellMemberPredicate}
    AND EXISTS (SELECT 1 FROM sections WHERE org_id = ?1 AND id = COALESCE(?5, workspaces.section_id))`
  const branch = namedBranchSql(name)
  const first = db
    .prepare(
      `${workspaceTreeSql}, changing AS MATERIALIZED (
         SELECT id FROM tree_rows WHERE id = ?2 AND (?3 IS NOT NULL OR
           (${moving ? 'id IN (SELECT id FROM top_level)' : '1'} AND (?6 = 0 OR section_id != ?5)))
       ) UPDATE workspaces SET name = COALESCE(?3, name), branch = ${branch.sql},
         updated_at = CASE WHEN id IN (SELECT id FROM changing) THEN MAX(updated_at, ?4) ELSE updated_at END
       WHERE id = ?2 AND ${guard}
       RETURNING id, id IN (SELECT id FROM changing) AS changed`,
    )
    .bind(
      orgId,
      workspaceId,
      name ?? null,
      now,
      sectionId ?? null,
      input.keepCurrentSection ? 1 : 0,
      ...branch.values,
      orgId,
      userId,
    )
  if (moving) return writeWorkspaceTree(db, { ...input, kind: 'move' }, first)
  const result = await db.batch<{ id: string }>([first])
  return {
    updated: result[0].meta.changes > 0,
    workspaceIds: result[0].results.map(({ id }) => id),
  }
}
