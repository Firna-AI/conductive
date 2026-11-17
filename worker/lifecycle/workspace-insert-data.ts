import { MAX_WORKSPACE_DEPTH } from '../../src/shared/workspace-tree'
import { activeOrgIdPredicate } from '../data/org-access'
import { HttpError } from '../http'
import type { insertWorkspace } from './workspace-data'

export interface WorkspaceParent {
  number: number
  parentId: string | null
  depth: number
}

export const parentAncestrySql = `WITH RECURSIVE ancestors AS (
  SELECT id, number, parent_workspace_id AS parentId, 0 AS depth, json_array(id) AS path
  FROM workspaces WHERE org_id = ?1 AND id = ?2
  UNION ALL
  SELECT w.id, w.number, w.parent_workspace_id, a.depth + 1, json_insert(a.path, '$[#]', w.id)
  FROM workspaces w JOIN ancestors a ON w.id = a.parentId WHERE w.org_id = ?1
    AND NOT EXISTS (SELECT 1 FROM json_each(a.path) WHERE value = w.id)
)`

export function parentDepthStatement(
  db: D1Database,
  orgId: string,
  parentId?: string,
) {
  return db
    .prepare(
      `${parentAncestrySql}
    SELECT number, parentId, (SELECT MAX(depth) FROM ancestors) AS depth
    FROM ancestors WHERE depth = 0`,
    )
    .bind(orgId, parentId ?? null)
}

export function requireWorkspaceParentDepth(parent: WorkspaceParent | null) {
  if (!parent)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The parent workspace is not available.',
    )
  if (parent.depth >= MAX_WORKSPACE_DEPTH)
    throw new HttpError(
      409,
      'nesting_limit',
      `W-${parent.number} is at the deepest level. Create a sibling instead. Pass parentId "${parent.parentId}". Start the name with a one-word group prefix, such as "Limits: ".`,
    )
}

export function workspaceInsertStatement(
  db: D1Database,
  input: Parameters<typeof insertWorkspace>[1],
  sectionId: string,
) {
  return db
    .prepare(
      `${parentAncestrySql}, destination AS (
    SELECT COALESCE((SELECT section_id FROM workspaces WHERE org_id = ?1 AND id = ?2), ?) AS section_id
  ) INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id, parent_workspace_id,
    name, branch, branch_placeholder, base_branch, provider_account, mac_access, state, created_at, updated_at, last_activity_at, position)
  SELECT ?, ?, ?, ?, destination.section_id, ?2, ?, ?, 1, ?, ?, ?, 'starting', ?, ?, ?,
    (SELECT COALESCE(MIN(position) - 1, 0) FROM workspaces
     WHERE org_id = ?1 AND section_id = destination.section_id AND archived_at IS NULL AND state != 'archived')
  FROM destination WHERE ${activeOrgIdPredicate('?')}
    AND (?2 IS NULL OR (EXISTS (SELECT 1 FROM ancestors)
      AND NOT EXISTS (SELECT 1 FROM ancestors WHERE depth >= ${MAX_WORKSPACE_DEPTH})))`,
    )
    .bind(
      input.orgId,
      input.parentId ?? null,
      sectionId,
      input.id,
      input.orgId,
      input.repositoryId,
      input.user.id,
      input.name ?? '',
      input.branch,
      input.baseBranch ?? null,
      input.providerAccount,
      Number(input.capabilities?.macAccess ?? true),
      input.now,
      input.now,
      input.now,
      input.orgId,
    )
}
