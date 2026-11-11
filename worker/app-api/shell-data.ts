import type { Repository } from '../../src/shared/org-settings'
import type { Section } from '../../src/shared/sections'
import {
  workspaceColumns,
  type WorkspaceRow,
} from '../lifecycle/workspace-data'
import { workspaceImageJoins } from '../lifecycle/workspace-software-data'
import { activeOrgIdPredicate } from '../data/org-access'
import { requireActiveOrg } from '../data/user-access'

export async function shellSections(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<Section[]> {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.org_id AS orgId, s.name, s.position, s.is_default AS isDefault,
     COALESCE(p.collapsed, 0) AS collapsed FROM sections s
     LEFT JOIN section_preferences p ON p.section_id = s.id AND p.user_id = ?
     WHERE s.org_id = ? ORDER BY s.position, s.id`,
    )
    .bind(userId, orgId)
    .all<
      Omit<Section, 'isDefault' | 'collapsed'> & {
        isDefault: number
        collapsed: number
      }
    >()
  return results.map((row) => ({
    ...row,
    isDefault: row.isDefault === 1,
    collapsed: row.collapsed === 1,
  }))
}

export async function shellRepositories(
  db: D1Database,
  orgId: string,
): Promise<Repository[]> {
  const { results } = await db
    .prepare(
      `SELECT id, org_id AS orgId, github_repository_id AS githubId, full_name AS fullName,
     description, default_branch AS defaultBranch, installation_id AS installationId, selected
     FROM repositories WHERE org_id = ? AND installation_id IS NOT NULL ORDER BY full_name, id`,
    )
    .bind(orgId)
    .all<Omit<Repository, 'selected'> & { selected: number }>()
  return results.map((row) => ({ ...row, selected: row.selected === 1 }))
}

export interface ListedWorkspaceRow extends WorkspaceRow {
  readThroughEventNumber: number
}

export async function shellWorkspaces(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<ListedWorkspaceRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${workspaceColumns},
     COALESCE(m.through_event_number, 0) AS readThroughEventNumber
     FROM workspaces w JOIN users u ON u.id = w.owner_user_id
     JOIN workspace_runtime r ON r.workspace_id = w.id
     JOIN orgs o ON o.id = w.org_id
     ${workspaceImageJoins}
     LEFT JOIN sections s ON s.id = w.section_id
     LEFT JOIN workspace_read_states m ON m.workspace_id = w.id AND m.user_id = ?
     WHERE w.org_id = ? AND o.deleted_at IS NULL
     ORDER BY CASE WHEN w.archived_at IS NULL AND w.state != 'archived' THEN 0 ELSE 1 END,
       s.position, w.position, w.created_at, w.id`,
    )
    .bind(userId, orgId)
    .all<ListedWorkspaceRow>()
  return results
}

export async function workspaceReadMark(
  db: D1Database,
  workspaceId: string,
  userId: string,
): Promise<number> {
  const row = await db
    .prepare(
      'SELECT through_event_number AS throughEventNumber FROM workspace_read_states WHERE workspace_id = ? AND user_id = ?',
    )
    .bind(workspaceId, userId)
    .first<{ throughEventNumber: number }>()
  return row?.throughEventNumber ?? 0
}

export async function saveWorkspaceReadMark(
  db: D1Database,
  input: {
    workspaceId: string
    orgId: string
    userId: string
    throughEventNumber: number
    now: number
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO workspace_read_states (workspace_id, org_id, user_id, through_event_number, updated_at)
     SELECT ?, ?, ?, ?, ? WHERE ${activeOrgIdPredicate('?')}
     ON CONFLICT(workspace_id, user_id) DO UPDATE SET
     through_event_number = MAX(workspace_read_states.through_event_number, excluded.through_event_number),
     updated_at = excluded.updated_at`,
    )
    .bind(
      input.workspaceId,
      input.orgId,
      input.userId,
      input.throughEventNumber,
      input.now,
      input.orgId,
    )
    .run()
  await requireActiveOrg(db, input.orgId)
}
