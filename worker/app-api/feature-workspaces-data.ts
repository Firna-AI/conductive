import {
  placeWorkspaces,
  type TreeWorkspace,
} from '../../src/shared/workspace-tree'
import { namedBranchSql } from '../lifecycle/workspace-branch'
import { listedQueueEntries, queueEntryBindingSql } from '../merge-queue/read'
import {
  guardedBatch,
  guardedStatement,
  shellGuard,
  shellRead,
  type GuardedStatement,
} from './shell-guard'
import { shellSections } from './shell-data'

export async function readWorkspaceTree(db: D1Database, orgId: string) {
  const [stored, sections, entries] = await Promise.all([
    shellRead(
      db,
      `SELECT id, number, parent_workspace_id AS parentId, section_id AS sectionId,
       CASE WHEN archived_at IS NOT NULL THEN 'archived' ELSE state END AS state,
       created_at AS createdAt FROM workspaces WHERE org_id = ? ORDER BY position, created_at, id`,
      [orgId],
    ).all<TreeWorkspace & { number: number }>(),
    shellSections(db, orgId, ''),
    listedQueueEntries(db, orgId),
  ])
  const workspaces = stored.results.map((workspace) => ({
    ...workspace,
    mergeQueue: entries.get(workspace.id),
  }))
  return {
    workspaces,
    sections,
    rows: placeWorkspaces(workspaces, sections),
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
  const seen = new Set<string>()
  while (root?.parentId && !seen.has(root.workspace.id)) {
    seen.add(root.workspace.id)
    root = rows.find(({ workspace }) => workspace.id === root?.parentId)
  }
  return {
    root: root?.workspace,
    nested: placement !== undefined && placement.parentId !== null,
  }
}

export const workspaceTreeSql = `WITH RECURSIVE queued(id) AS MATERIALIZED (
  SELECT e.workspace_id FROM merge_queue_entries e ${queueEntryBindingSql} WHERE q.org_id = ?1
), tree_rows AS MATERIALIZED (
  SELECT w.*, archived_at IS NULL AND state != 'archived' AS live,
    queued.id IS NOT NULL AS queued,
    archived_at IS NULL AND state != 'archived' AND queued.id IS NULL AS shown,
    COALESCE(
      (SELECT id FROM sections WHERE org_id = ?1 AND id = w.section_id),
      (SELECT id FROM sections WHERE org_id = ?1 ORDER BY is_default DESC, position LIMIT 1),
      section_id) AS shown_section_id
  FROM workspaces w LEFT JOIN queued ON queued.id = w.id WHERE org_id = ?1
), ancestors(id, ancestor_id) AS (
  SELECT id, parent_workspace_id FROM tree_rows WHERE parent_workspace_id IS NOT NULL
  UNION
  SELECT a.id, p.parent_workspace_id FROM ancestors a
  JOIN tree_rows p ON p.id = a.ancestor_id WHERE p.parent_workspace_id IS NOT NULL
), top_level AS MATERIALIZED (
  SELECT w.* FROM tree_rows w WHERE shown AND NOT EXISTS (
    SELECT 1 FROM ancestors a JOIN tree_rows p ON p.id = a.ancestor_id
    WHERE a.id = w.id AND p.shown
  )
), subtree(id) AS (
  SELECT id FROM tree_rows WHERE id = ?2
  UNION
  SELECT w.id FROM tree_rows w JOIN subtree t ON w.parent_workspace_id = t.id
), promotion_path(id, shown) AS (
  SELECT id, shown FROM tree_rows WHERE parent_workspace_id = ?2
  UNION
  SELECT w.id, w.shown FROM tree_rows w
  JOIN promotion_path p ON w.parent_workspace_id = p.id WHERE NOT p.shown
), promoted AS MATERIALIZED (
  SELECT id FROM promotion_path WHERE shown
)`

interface TreeWrite {
  orgId: string
  userId: string
  workspaceId: string
  sectionId?: string
  position?: number
  keepCurrentSection?: boolean
  now: number
}

async function writeWorkspaceTree(
  db: D1Database,
  operation: TreeWrite,
  first: GuardedStatement,
) {
  const { orgId, workspaceId } = operation
  const moving = `${workspaceTreeSql}, moving AS MATERIALIZED (
    SELECT id, queued, COALESCE(?3, shown_section_id) AS destination FROM tree_rows
    WHERE id = ?2 AND live AND (?4 = 0 OR section_id != ?3)
      AND (id IN (SELECT id FROM top_level) OR (?4 = 1 AND queued))
      AND ${shellGuard}
      AND EXISTS (SELECT 1 FROM sections WHERE org_id = ?1 AND id = COALESCE(?3, shown_section_id))
  )`
  const bindings = [
    orgId,
    workspaceId,
    operation.sectionId ?? null,
    operation.keepCurrentSection ? 1 : 0,
  ]
  const result = await guardedBatch<{ id: string; changed?: number }>(db, [
    first,
    guardedStatement(
      db,
      operation,
      `${moving}, siblings AS MATERIALIZED (
         SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at, id) - 1 AS rank
         FROM top_level WHERE shown_section_id = (SELECT destination FROM moving WHERE NOT queued) AND id != ?2
       ), destination AS MATERIALIZED (
         SELECT MIN(?5, COUNT(*)) AS position FROM siblings
       ), ranks AS MATERIALIZED (
         SELECT siblings.id, rank + (rank >= destination.position) AS position
         FROM siblings CROSS JOIN destination
         UNION ALL SELECT moving.id, destination.position FROM moving CROSS JOIN destination WHERE NOT moving.queued
       ) UPDATE workspaces SET position = (
         SELECT ranks.position FROM ranks WHERE ranks.id = workspaces.id
       ) WHERE org_id = ?1 AND id IN (SELECT id FROM ranks) AND EXISTS (SELECT 1 FROM moving)`,
      [...bindings, operation.position ?? 0],
    ),
    guardedStatement(
      db,
      operation,
      `${moving} UPDATE workspaces SET
       section_id = (SELECT destination FROM moving), updated_at = MAX(updated_at, ?5)
       WHERE org_id = ?1 AND id IN (SELECT id FROM subtree) AND EXISTS (
         SELECT 1 FROM moving WHERE NOT queued OR id = workspaces.id)
       RETURNING id`,
      [...bindings, operation.now],
    ),
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
  return shellRead(db, 'SELECT id FROM sections WHERE org_id = ? AND id = ?', [
    orgId,
    sectionId,
  ]).first<{ id: string }>()
}

/**
 * Renames or moves a workspace, and gives the IDs of each workspace that
 * the write changed, for the metadata publish.
 */
export async function writeShellWorkspace(
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
  const { orgId, workspaceId, name, now, sectionId, position } = input
  const moving = sectionId !== undefined || position !== undefined
  const guard = `org_id = ?1 AND archived_at IS NULL AND state != 'archived'
    AND ${shellGuard}
    AND EXISTS (SELECT 1 FROM sections WHERE org_id = ?1 AND id = COALESCE(?5, workspaces.section_id))`
  const branch = namedBranchSql(name)
  let branchBinding = 6
  const branchSql = branch.sql.replace(/\?/g, () => `?${++branchBinding}`)
  const first = guardedStatement(
    db,
    input,
    `${workspaceTreeSql}, changing AS MATERIALIZED (
         SELECT id FROM tree_rows WHERE id = ?2 AND (?3 IS NOT NULL OR
           (${moving ? '(id IN (SELECT id FROM top_level) OR (?6 = 1 AND queued))' : '1'}
            AND (?6 = 0 OR section_id != ?5)))
       ) UPDATE workspaces SET name = COALESCE(?3, name), branch = ${branchSql},
         updated_at = CASE WHEN id IN (SELECT id FROM changing) THEN MAX(updated_at, ?4) ELSE updated_at END
       WHERE id = ?2 AND ${guard}
       RETURNING id, id IN (SELECT id FROM changing) AS changed`,
    [
      orgId,
      workspaceId,
      name ?? null,
      now,
      sectionId ?? null,
      input.keepCurrentSection ? 1 : 0,
      ...branch.values,
    ],
  )
  if (moving) return writeWorkspaceTree(db, input, first)
  const result = await guardedBatch<{ id: string }>(db, [first])
  return {
    updated: result[0].meta.changes > 0,
    workspaceIds: result[0].results.map(({ id }) => id),
  }
}

/** Renames or moves a workspace, and says whether the write changed it. */
export async function updateShellWorkspace(
  db: D1Database,
  input: Parameters<typeof writeShellWorkspace>[1],
): Promise<boolean> {
  return (await writeShellWorkspace(db, input)).updated
}
