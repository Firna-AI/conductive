import type { ImageVersions } from './image-records'

export const workspaceInstallScriptChangedColumn = `(b.id IS NOT NULL
  AND w.install_script_revision IS NOT b.install_script_revision) AS installScriptChanged`

export const workspaceImageJoins = `LEFT JOIN org_images i ON i.org_id = w.org_id
  AND i.provider_account = w.provider_account
  LEFT JOIN image_builds b ON b.id = i.image_build_id AND b.org_id = i.org_id
  AND b.provider_account = i.provider_account AND b.snapshot_name = i.image_name
  AND b.state = 'succeeded'`

export interface WorkspaceImageRecords extends ImageVersions {
  orgImageBuildId: string | null
  softwareUpdateFailed: boolean
}

export async function readWorkspaceImageRecords(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceImageRecords | null> {
  const row = await db
    .prepare(
      `SELECT software_version AS softwareVersion, org_image_build_id AS orgImageBuildId,
       install_script_revision AS installScriptRevision, software_update_failed AS softwareUpdateFailed
       FROM workspaces WHERE org_id = ? AND id = ?`,
    )
    .bind(orgId, workspaceId)
    .first<
      Omit<WorkspaceImageRecords, 'softwareUpdateFailed'> & {
        softwareUpdateFailed: number
      }
    >()
  return row && { ...row, softwareUpdateFailed: row.softwareUpdateFailed === 1 }
}

export async function workspaceSoftwareIsOlder(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  currentVersion: string,
): Promise<boolean> {
  const records = await readWorkspaceImageRecords(db, orgId, workspaceId)
  return records?.softwareVersion !== currentVersion
}

export async function workspaceInstallScriptDiffers(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT ${workspaceInstallScriptChangedColumn}
       FROM workspaces w ${workspaceImageJoins}
       WHERE w.org_id = ? AND w.id = ?`,
    )
    .bind(orgId, workspaceId)
    .first<{ installScriptChanged: number }>()
  return row?.installScriptChanged === 1
}

/** Read the allocated snapshot's immutable build, even after a newer publication. */
export async function recordWorkspaceImage(
  db: D1Database,
  input: {
    orgId: string
    workspaceId: string
    providerAccount: string
    imageName: string | null
  },
): Promise<void> {
  await db
    .prepare(
      `UPDATE workspaces SET (software_version, org_image_build_id, install_script_revision) =
       (SELECT b.software_version, b.id, b.install_script_revision FROM image_builds b
        WHERE b.org_id = ? AND b.provider_account = ? AND b.snapshot_name = ?
          AND b.state = 'succeeded' LIMIT 1), software_update_failed = 0
       WHERE org_id = ? AND id = ?`,
    )
    .bind(
      input.orgId,
      input.providerAccount,
      input.imageName,
      input.orgId,
      input.workspaceId,
    )
    .run()
}

export async function recordWorkspaceSoftwareVersion(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  version: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE workspaces SET software_version = ?, software_update_failed = 0
       WHERE org_id = ? AND id = ?`,
    )
    .bind(version, orgId, workspaceId)
    .run()
}

export async function recordWorkspaceInstallScriptRevision(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  revision: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE workspaces SET install_script_revision = ? WHERE org_id = ? AND id = ?',
    )
    .bind(revision, orgId, workspaceId)
    .run()
}

export async function recordWorkspaceSoftwareUpdateFailed(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  failed: boolean,
): Promise<void> {
  await db
    .prepare(
      'UPDATE workspaces SET software_update_failed = ? WHERE org_id = ? AND id = ?',
    )
    .bind(failed ? 1 : 0, orgId, workspaceId)
    .run()
}
