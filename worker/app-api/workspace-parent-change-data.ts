import { MAX_WORKSPACE_DEPTH } from '../../src/shared/workspace-tree'
import { HttpError } from '../http'
import { guardedBatch, guardedStatement, shellGuard } from './shell-guard'
import { workspaceTreeSql } from './feature-workspaces-data'

export type WorkspaceParentTarget =
  { kind: 'parent'; id: string } | { kind: 'top-level' }

interface ParentChange {
  orgId: string
  userId: string
  workspaceId: string
  sectionId?: string
  target: WorkspaceParentTarget
  now: number
}

interface MoveCheck {
  error: string | null
  destination: string
  height: number
  deepestNumber: number
  unchanged: number
}

const parentChangeSql = `${workspaceTreeSql}, move_input AS MATERIALIZED (
  SELECT ?3 AS parent_id, ?4 AS section_id, ?5 AS now
), placements AS MATERIALIZED (
  SELECT w.*, COALESCE((SELECT p.shown_section_id FROM top_level p
    WHERE p.id = w.id OR p.id IN (SELECT ancestor_id FROM ancestors WHERE id = w.id)
    LIMIT 1), w.shown_section_id) AS effective_section_id
  FROM tree_rows w WHERE id IN (?2, ?3)
), parent_path(id, depth, path) AS (
  SELECT id, 0, json_array(id) FROM tree_rows WHERE id = ?3
  UNION ALL
  SELECT p.id, a.depth + 1, json_insert(a.path, '$[#]', p.id)
  FROM parent_path a JOIN tree_rows w ON w.id = a.id
  JOIN tree_rows p ON p.id = w.parent_workspace_id
  WHERE NOT EXISTS (SELECT 1 FROM json_each(a.path) WHERE value = p.id)
), nodes(id, parent_id) AS MATERIALIZED (
  SELECT id, parent_workspace_id FROM tree_rows
  UNION ALL
  SELECT p.workspace_id, p.parent_workspace_id FROM workspace_creation_plans p
  JOIN workspace_creation_attempts a ON a.workspace_id = p.workspace_id
  WHERE a.org_id = ?1 AND a.state = 'pending'
    AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = p.workspace_id)
), tree_depth(id, depth, path) AS (
  SELECT id, 0, json_array(id) FROM nodes WHERE id = ?2
  UNION ALL
  SELECT n.id, t.depth + 1, json_insert(t.path, '$[#]', n.id)
  FROM tree_depth t JOIN nodes n ON n.parent_id = t.id
  WHERE NOT EXISTS (SELECT 1 FROM json_each(t.path) WHERE value = n.id)
), dimensions AS MATERIALIZED (
  SELECT COALESCE((SELECT MAX(depth) FROM tree_depth), 0) AS height,
    (SELECT w.number FROM tree_depth t JOIN tree_rows w ON w.id = t.id
     ORDER BY t.depth DESC, w.created_at, w.id LIMIT 1) AS deepestNumber,
    COALESCE((SELECT MAX(depth) FROM parent_path), -1) AS parent_depth
), checked AS MATERIALIZED (
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM tree_rows WHERE id = ?2) THEN 'workspace_not_found'
    WHEN NOT EXISTS (SELECT 1 FROM tree_rows WHERE id = ?2 AND live) THEN 'workspace_archived'
    WHEN ?4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sections WHERE org_id = ?1 AND id = ?4)
      THEN 'section_not_found'
    WHEN ?3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tree_rows WHERE id = ?3)
      THEN 'parent_not_found'
    WHEN ?3 IN (SELECT id FROM subtree) THEN 'nesting_cycle'
    WHEN parent_depth + 1 + height > ${MAX_WORKSPACE_DEPTH} THEN 'nesting_limit'
    WHEN NOT ${shellGuard} THEN 'access'
    END AS error,
    COALESCE((SELECT effective_section_id FROM placements WHERE id = ?3),
      ?4, (SELECT effective_section_id FROM placements WHERE id = ?2)) AS destination,
    height, deepestNumber,
    COALESCE((SELECT parent_workspace_id IS ?3 AND (?3 IS NOT NULL OR
      COALESCE(?4, effective_section_id) = effective_section_id)
      FROM placements WHERE id = ?2), 0) AS unchanged
  FROM dimensions CROSS JOIN move_input
), moving AS MATERIALIZED (
  SELECT * FROM checked WHERE error IS NULL AND NOT unchanged
)`

/** Checks and changes the parent, tree sections, and places in one batch. */
export async function writeWorkspaceParentChange(
  db: D1Database,
  input: ParentChange,
) {
  const bindings = [
    input.orgId,
    input.workspaceId,
    input.target.kind === 'parent' ? input.target.id : null,
    input.sectionId ?? null,
    input.now,
  ]
  const results = await guardedBatch<
    MoveCheck & { id: string; changed: number }
  >(db, [
    guardedStatement(
      db,
      input,
      `${parentChangeSql} SELECT * FROM checked`,
      bindings,
    ),
    guardedStatement(
      db,
      input,
      `${parentChangeSql}, ranks AS MATERIALIZED (
          SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at, id) AS position
          FROM top_level WHERE shown_section_id = (SELECT destination FROM moving)
            AND id NOT IN (SELECT id FROM subtree) AND ?3 IS NULL
            AND NOT EXISTS (SELECT 1 FROM placements WHERE id = ?2 AND queued)
        ) UPDATE workspaces SET
          parent_workspace_id = CASE WHEN id = ?2 THEN ?3 ELSE parent_workspace_id END,
          section_id = CASE WHEN id IN (SELECT id FROM subtree)
            THEN (SELECT destination FROM moving) ELSE section_id END,
          position = CASE WHEN id = ?2 AND ?3 IS NULL
            AND NOT EXISTS (SELECT 1 FROM placements WHERE id = ?2 AND queued) THEN 0
            ELSE COALESCE((SELECT position FROM ranks WHERE ranks.id = workspaces.id), position) END,
          updated_at = CASE WHEN id IN (SELECT id FROM subtree)
            THEN MAX(updated_at, ?5) ELSE updated_at END
        WHERE org_id = ?1 AND EXISTS (SELECT 1 FROM moving)
          AND (id IN (SELECT id FROM subtree) OR id IN (SELECT id FROM ranks))
        RETURNING id, id IN (SELECT id FROM subtree) AS changed`,
      bindings,
    ),
  ])
  const check = results[0].results[0]
  if (!check) throw new Error('The parent change check is missing.')
  if (check.error !== null && check.error !== 'access')
    throw parentChangeError(check)
  return {
    updated: check.error === null,
    workspaceIds: results[1].results
      .filter(({ changed }) => changed !== 0)
      .map(({ id }) => id),
  }
}

function parentChangeError(check: MoveCheck): HttpError {
  switch (check.error) {
    case 'workspace_archived':
      return new HttpError(409, check.error, 'The archived chat is read-only.')
    case 'nesting_cycle':
      return new HttpError(
        409,
        check.error,
        'A workspace cannot move under itself or a workspace nested under it.',
      )
    case 'nesting_limit':
      return new HttpError(
        409,
        check.error,
        `W-${check.deepestNumber} is the deepest workspace in the moved tree. Choose a parent at depth ${MAX_WORKSPACE_DEPTH - check.height - 1} or less.`,
      )
    case 'parent_not_found':
      return new HttpError(
        404,
        'workspace_not_found',
        'The parent workspace is not available.',
      )
    case 'section_not_found':
      return new HttpError(404, check.error, 'The section is not available.')
    default:
      return new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
  }
}
