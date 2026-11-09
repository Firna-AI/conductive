import { BASE_IMAGE } from '../../src/shared/base-image'
import type { OrgSettings } from '../../src/shared/org-settings'
import { HttpError } from '../http'
import { activeAdminPredicate } from '../members/org-data'
import type { OrgEnvironment } from '../lifecycle/org-environment'

export interface ShellSettingsRow {
  installScript: string
  startupScript: string
  envVarsCiphertext: string | null
  revision: number
  updatedAt: number
  builtRevision: number | null
}

export async function readShellSettings(
  db: D1Database,
  orgId: string,
): Promise<ShellSettingsRow> {
  const row = await db
    .prepare(
      `SELECT s.install_script AS installScript, s.startup_script AS startupScript,
       s.env_vars_ciphertext AS envVarsCiphertext, s.revision, s.updated_at AS updatedAt,
       b.settings_revision AS builtRevision
       FROM settings s LEFT JOIN image_builds b ON b.id = s.image_build_id
       WHERE s.org_id = ?`,
    )
    .bind(orgId)
    .first<ShellSettingsRow>()
  if (!row)
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  return row
}

export function shellSettingsView(
  row: ShellSettingsRow,
  environment: OrgEnvironment,
): OrgSettings {
  return {
    baseImage: BASE_IMAGE,
    installScript: row.installScript,
    startupScript: row.startupScript,
    envVars: Object.entries(environment)
      .sort(([a], [b]) => (a === b ? 0 : a < b ? -1 : 1))
      .map(([name, entry]) => ({ name, secret: entry.secret })),
    updatedAt: row.updatedAt,
    needsBuild: row.builtRevision !== row.revision,
  }
}

export function updateShellSettings(
  db: D1Database,
  input: {
    orgId: string
    userId: string
    before: ShellSettingsRow
    installScript?: string
    startupScript?: string
    envVarsCiphertext?: string
    now: number
  },
) {
  const { before } = input
  return db
    .prepare(
      `UPDATE settings SET
       revision = revision + CASE WHEN install_script != ? THEN 1 ELSE 0 END,
       install_script = ?, startup_script = ?, env_vars_ciphertext = ?, updated_at = ?
       WHERE org_id = ? AND revision = ? AND startup_script = ?
         AND env_vars_ciphertext IS ? AND ${activeAdminPredicate}
       RETURNING org_id AS orgId`,
    )
    .bind(
      input.installScript ?? before.installScript,
      input.installScript ?? before.installScript,
      input.startupScript ?? before.startupScript,
      input.envVarsCiphertext ?? before.envVarsCiphertext,
      input.now,
      input.orgId,
      before.revision,
      before.startupScript,
      before.envVarsCiphertext,
      input.orgId,
      input.userId,
    )
    .first<{ orgId: string }>()
}
