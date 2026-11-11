import { workspaceNameColumn } from '../data/workspace-name'
import { presentWorkspace } from '../data/workspace-link'
import type { Workspace, WorkspaceState } from '../../src/shared/workspaces'
import { workspaceRestoreUntil } from '../../src/shared/workspaces'
import { HttpError } from '../http'
import {
  workspaceImageJoins,
  workspaceInstallScriptChangedColumn,
} from './workspace-software-data'

export interface WorkspaceRow {
  id: string
  number: number
  orgId: string
  repositoryId: string
  sectionId: string
  ownerUserId: string
  githubLogin: string
  displayName: string | null
  avatarUrl: string | null
  name: string | null
  branch: string
  baseBranch?: string | null
  sandboxId: string | null
  providerAccount: string
  softwareUpdateFailed?: number
  installScriptChanged?: number
  state: WorkspaceState
  createdAt: number
  updatedAt: number
  archivedAt: number | null
  stoppedAt: number | null
  nextDiskKeepaliveAt: number | null
  agent: Workspace['choice']['agent']
  model: string
  effort: Workspace['choice']['effort']
  sessionId: string
  firstTurnId: string
}

export const workspaceColumns = `w.id, w.number, w.org_id AS orgId, w.repository_id AS repositoryId,
  w.section_id AS sectionId, w.owner_user_id AS ownerUserId,
  u.github_login AS githubLogin, u.display_name AS displayName, u.avatar_url AS avatarUrl,
  ${workspaceNameColumn('w')}, w.branch,
  w.sandbox_id AS sandboxId,
  w.provider_account AS providerAccount, w.state, w.software_update_failed AS softwareUpdateFailed,
  ${workspaceInstallScriptChangedColumn},
  w.created_at AS createdAt, w.updated_at AS updatedAt, w.archived_at AS archivedAt,
  w.stopped_at AS stoppedAt, w.next_disk_keepalive_at AS nextDiskKeepaliveAt,
  r.agent, r.model, r.effort, r.session_id AS sessionId, r.first_turn_id AS firstTurnId`

export async function readWorkspace(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceRow> {
  const row = await db
    .prepare(
      `SELECT ${workspaceColumns},
     COALESCE(w.base_branch, (SELECT default_branch FROM repositories WHERE id = w.repository_id AND org_id = w.org_id)) AS baseBranch
     FROM workspaces w JOIN users u ON u.id = w.owner_user_id
     JOIN workspace_runtime r ON r.workspace_id = w.id
     JOIN orgs ON orgs.id = w.org_id
     ${workspaceImageJoins}
     WHERE w.id = ? AND w.org_id = ? AND orgs.deleted_at IS NULL`,
    )
    .bind(workspaceId, orgId)
    .first<WorkspaceRow>()
  if (!row)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  return row
}

export function workspaceView(row: WorkspaceRow, origin: string) {
  const record = workspaceRecord(row)
  return {
    ...record,
    ...presentWorkspace(record, {
      origin,
      orgId: row.orgId,
      workspaceId: row.id,
      number: row.number,
    }),
  }
}

export function workspaceRecord(row: WorkspaceRow) {
  return {
    id: row.id,
    number: row.number,
    orgId: row.orgId,
    repositoryId: row.repositoryId,
    sectionId: row.sectionId,
    owner: {
      id: row.ownerUserId,
      githubLogin: row.githubLogin,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    },
    name: row.name,
    branch: row.branch,
    choice: { agent: row.agent, model: row.model, effort: row.effort },
    state: row.state,
    softwareUpdateFailed:
      row.softwareUpdateFailed === undefined
        ? undefined
        : row.softwareUpdateFailed === 1,
    installScriptChanged:
      row.installScriptChanged === undefined
        ? undefined
        : row.installScriptChanged === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
    restoreUntil: workspaceRestoreUntil(row.archivedAt, row.sandboxId),
  }
}

export async function assignSandbox(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  sandboxId: string,
  providerAccount: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE workspaces SET sandbox_id = ?, provider_account = ? WHERE id = ? AND org_id = ?',
    )
    .bind(sandboxId, providerAccount, workspaceId, orgId)
    .run()
}

export async function deleteProvisionalWorkspace(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<void> {
  await db.batch([
    db
      .prepare('DELETE FROM workspaces WHERE id = ? AND org_id = ?')
      .bind(workspaceId, orgId),
    db
      .prepare(
        "UPDATE workspace_creation_attempts SET state = 'failed' WHERE workspace_id = ? AND org_id = ?",
      )
      .bind(workspaceId, orgId),
  ])
}

export async function persistLifecycleState(
  db: D1Database,
  input: {
    workspaceId: string
    orgId: string
    state: WorkspaceState
    lastActivityAt: number
    stoppedAt: number | null
    nextDiskKeepaliveAt: number | null
    error: { code: string; message: string } | null
  },
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE workspaces SET state = ?, last_activity_at = ?, stopped_at = ?,
     next_disk_keepalive_at = ?, last_error_code = ?, last_error_message = ?, updated_at = MAX(updated_at, ?)
     WHERE id = ? AND org_id = ? AND archived_at IS NULL AND state != 'archived'
       AND EXISTS (SELECT 1 FROM orgs WHERE orgs.id = workspaces.org_id AND orgs.deleted_at IS NULL)`,
    )
    .bind(
      input.state,
      input.lastActivityAt,
      input.stoppedAt,
      input.nextDiskKeepaliveAt,
      input.error?.code ?? null,
      input.error?.message ?? null,
      now,
      input.workspaceId,
      input.orgId,
    )
    .run()
}

export async function revokeWorkspacePreviews(
  db: D1Database,
  workspaceId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      'UPDATE preview_hostnames SET revoked_at = ? WHERE workspace_id = ? AND revoked_at IS NULL',
    )
    .bind(now, workspaceId)
    .run()
}

export function workspaceExists(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<{ id: string } | null> {
  return db
    .prepare('SELECT id FROM workspaces WHERE org_id = ? AND id = ?')
    .bind(orgId, workspaceId)
    .first<{ id: string }>()
}
