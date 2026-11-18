import { BASE_IMAGE } from '../../src/shared/base-image'
import type { OrgSettings } from '../../src/shared/org-settings'
import { HttpError } from '../http'
import { activeAdminPredicate } from '../members/org-data'
import type { OrgEnvironment } from '../lifecycle/org-environment'

export interface ShellSettingsRow {
  installScript: string
  startupScript: string
  skillsRepository: string
  trustedSkillsRepository: string
  envVarsCiphertext: string | null
  revision: number
  updatedAt: number
}

export async function readShellSettings(
  db: D1Database,
  orgId: string,
): Promise<ShellSettingsRow> {
  const row = await db
    .prepare(
      `SELECT install_script AS installScript, startup_script AS startupScript,
       env_vars_ciphertext AS envVarsCiphertext, skills_repository AS skillsRepository,
       trusted_skills_repository AS trustedSkillsRepository,
       revision, updated_at AS updatedAt
       FROM settings WHERE org_id = ?`,
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
    skillsRepository: row.skillsRepository,
    trustedSkillsRepository: row.trustedSkillsRepository,
    envVars: Object.entries(environment)
      .sort(([a], [b]) => (a === b ? 0 : a < b ? -1 : 1))
      .map(([name, entry]) => ({ name, secret: entry.secret })),
    updatedAt: row.updatedAt,
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
    skillsRepository?: string
    trustedSkillsRepository?: string
    envVarsCiphertext?: string
    now: number
  },
) {
  const { before } = input
  return db
    .prepare(
      `UPDATE settings SET
       revision = revision + CASE WHEN install_script != ? THEN 1 ELSE 0 END,
       install_script = ?, startup_script = ?, env_vars_ciphertext = ?,
       skills_repository = ?, trusted_skills_repository = ?, updated_at = ?
       WHERE org_id = ? AND revision = ? AND startup_script = ?
         AND env_vars_ciphertext IS ? AND skills_repository = ?
         AND trusted_skills_repository = ? AND ${activeAdminPredicate}
       RETURNING org_id AS orgId`,
    )
    .bind(
      input.installScript ?? before.installScript,
      input.installScript ?? before.installScript,
      input.startupScript ?? before.startupScript,
      input.envVarsCiphertext ?? before.envVarsCiphertext,
      input.skillsRepository ?? before.skillsRepository,
      input.trustedSkillsRepository ?? before.trustedSkillsRepository,
      input.now,
      input.orgId,
      before.revision,
      before.startupScript,
      before.envVarsCiphertext,
      before.skillsRepository,
      before.trustedSkillsRepository,
      input.orgId,
      input.userId,
    )
    .first<{ orgId: string }>()
}
