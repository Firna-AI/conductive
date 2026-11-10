import type { AgentChoice } from '../../src/shared/agents'
import type { User } from '../../src/shared/api'
import { readWorkspace, type WorkspaceRow } from '../lifecycle/workspace-data'
import { requireOrgMember } from '../lifecycle/access'
import { requireActiveOrg } from '../data/user-access'
import { HttpError } from '../http'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'

export interface VerifiedImportedWorkspace {
  id: string
  orgId: string
  repositoryId: string
  importer: User
  localWorkspaceId: string
  name: string
  branch: string
  choice: AgentChoice
  now: number
  providerAccount?: string
}

const permitted = `EXISTS (
  SELECT 1 FROM orgs o JOIN org_members m ON m.org_id = o.id
  JOIN users u ON u.id = m.user_id JOIN repositories r ON r.org_id = o.id
  WHERE o.id = ? AND m.user_id = ? AND r.id = ? AND r.selected = 1
    AND o.deleted_at IS NULL AND o.suspended_at IS NULL AND u.suspended_at IS NULL
)`
const section = `(SELECT id FROM sections WHERE org_id = ?
  AND name = 'Import from Conductor' ORDER BY position, id LIMIT 1)`

/** Trusted publication boundary. Its caller must verify every stored import part first. */
export function importedWorkspaceStatements(
  db: D1Database,
  input: VerifiedImportedWorkspace,
  guard = '1',
  guardBindings: unknown[] = [],
): D1PreparedStatement[] {
  const { orgId, importer, repositoryId, id } = input
  const access = [orgId, importer.id, repositoryId]
  return [
    db
      .prepare(
        `INSERT INTO sections (id, org_id, name, position, is_default, created_at)
      SELECT ?, ?, 'Import from Conductor',
        (SELECT COALESCE(MIN(position) - 1, 0) FROM sections WHERE org_id = ?), 0, ?
      WHERE ${permitted} AND NOT EXISTS (SELECT 1 FROM sections
        WHERE org_id = ? AND name = 'Import from Conductor')
      AND NOT EXISTS (SELECT 1 FROM workspaces WHERE org_id = ? AND conductor_local_id = ?) AND ${guard}`,
      )
      .bind(
        `conductor-import-${id}`,
        orgId,
        orgId,
        input.now,
        ...access,
        orgId,
        orgId,
        input.localWorkspaceId,
        ...guardBindings,
      ),
    db
      .prepare(
        `INSERT INTO workspaces
      (id, org_id, repository_id, owner_user_id, section_id, name, branch,
       provider_account, state, created_at, updated_at, last_activity_at, position,
       conductor_local_id, imported_by_user_id)
      SELECT ?, ?, ?, ?, ${section}, ?, ?, ?, 'inactive', ?, ?, ?,
        (SELECT COALESCE(MIN(position) - 1, 0) FROM workspaces
         WHERE org_id = ? AND section_id = ${section}
           AND archived_at IS NULL AND state != 'archived'), ?, ?
      WHERE ${permitted} AND NOT EXISTS (SELECT 1 FROM workspaces
        WHERE org_id = ? AND conductor_local_id = ?) AND ${guard}`,
      )
      .bind(
        id,
        orgId,
        repositoryId,
        importer.id,
        orgId,
        input.name,
        input.branch,
        input.providerAccount ?? DEFAULT_PROVIDER_ACCOUNT,
        input.now,
        input.now,
        input.now,
        orgId,
        orgId,
        input.localWorkspaceId,
        importer.id,
        ...access,
        orgId,
        input.localWorkspaceId,
        ...guardBindings,
      ),
    db
      .prepare(
        `INSERT INTO workspace_runtime
      (workspace_id, org_id, created_by_user_id, agent, model, effort)
      SELECT id, org_id, imported_by_user_id, ?, ?, ? FROM workspaces
      WHERE id = ? AND org_id = ? AND conductor_local_id = ?
        AND imported_by_user_id = ? AND NOT EXISTS (SELECT 1 FROM workspace_runtime WHERE workspace_id = ?) AND ${guard}`,
      )
      .bind(
        input.choice.agent,
        input.choice.model,
        input.choice.effort,
        id,
        orgId,
        input.localWorkspaceId,
        importer.id,
        id,
        ...guardBindings,
      ),
  ]
}

export async function insertVerifiedImportedWorkspace(
  db: D1Database,
  input: VerifiedImportedWorkspace,
): Promise<WorkspaceRow> {
  const { orgId, importer } = input
  await requireActiveOrg(db, orgId)
  await requireOrgMember(db, orgId, importer.id)
  await db.batch(importedWorkspaceStatements(db, input))
  await requireActiveOrg(db, orgId)
  await requireOrgMember(db, orgId, importer.id)
  const saved = await db
    .prepare(
      'SELECT id FROM workspaces WHERE org_id = ? AND conductor_local_id = ?',
    )
    .bind(orgId, input.localWorkspaceId)
    .first<{ id: string }>()
  if (!saved)
    throw new HttpError(
      404,
      'repository_not_found',
      'The repository is not available.',
    )
  return readWorkspace(db, orgId, saved.id)
}
