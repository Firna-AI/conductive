import type { AppEnv } from '../env'
import { HttpError, isRecord } from '../http'
import { decrypt } from '../security/crypto'
import { readSavedScript, type SavedScript } from './saved-script'

export interface ImageSettings {
  orgId: string
  installScript: SavedScript
  startupScript: SavedScript
  envVarsCiphertext: string | null
  imageName: string | null
  imageBuildId: string | null
  revision: number
  lastRefreshAt: number | null
  lastPushRefreshAt: number | null
  pendingPushRefreshAt: number | null
  nextImageRefreshAt: number | null
}

export interface SelectedRepository {
  id: string
  orgId: string
  fullName: string
  defaultBranch: string
}

export function readRepositories(value: unknown): SelectedRepository[] {
  if (!Array.isArray(value)) throw new Error('Invalid stored repository list')
  return value.map((entry: unknown) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.orgId !== 'string' ||
      typeof entry.fullName !== 'string' ||
      typeof entry.defaultBranch !== 'string'
    )
      throw new Error('Invalid stored repository')
    return {
      id: entry.id,
      orgId: entry.orgId,
      fullName: entry.fullName,
      defaultBranch: entry.defaultBranch,
    }
  })
}

export async function readImageSettings(
  db: D1Database,
  orgId: string,
): Promise<ImageSettings> {
  const row = await db
    .prepare(
      `SELECT org_id AS orgId, install_script AS installScript,
       startup_script AS startupScript, env_vars_ciphertext AS envVarsCiphertext,
       org_image_name AS imageName, image_build_id AS imageBuildId, revision,
       last_refresh_at AS lastRefreshAt, last_push_refresh_at AS lastPushRefreshAt,
       next_image_refresh_at AS nextImageRefreshAt, pending_push_refresh_at AS pendingPushRefreshAt
     FROM settings WHERE org_id = ?`,
    )
    .bind(orgId)
    .first<
      Omit<ImageSettings, 'installScript' | 'startupScript'> & {
        installScript: string
        startupScript: string
      }
    >()
  if (!row)
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  return {
    ...row,
    installScript: readSavedScript(row.installScript),
    startupScript: readSavedScript(row.startupScript),
  }
}

export async function selectedRepositories(
  db: D1Database,
  orgId: string,
): Promise<SelectedRepository[]> {
  const { results } = await db
    .prepare(
      `SELECT id, org_id AS orgId, full_name AS fullName, default_branch AS defaultBranch
     FROM repositories WHERE org_id = ? AND selected = 1 ORDER BY id`,
    )
    .bind(orgId)
    .all<SelectedRepository>()
  return results
}

/** Settings writers use this context to keep encrypted values bound to their org. */
export function orgEnvironmentContext(orgId: string): string {
  return JSON.stringify(['org-environment', orgId])
}

export async function workspaceRepository(
  db: D1Database,
  orgId: string,
  repositoryId: string,
): Promise<SelectedRepository> {
  const row = await db
    .prepare(
      'SELECT id, org_id AS orgId, full_name AS fullName, default_branch AS defaultBranch FROM repositories WHERE org_id = ? AND id = ?',
    )
    .bind(orgId, repositoryId)
    .first<SelectedRepository>()
  if (!row)
    throw new HttpError(
      404,
      'repository_not_found',
      'The repository is not available.',
    )
  return row
}

export async function workspaceEnvironment(
  env: AppEnv,
  orgId: string,
  ciphertext?: string | null,
): Promise<Record<string, string>> {
  const stored =
    ciphertext === undefined
      ? (await readImageSettings(env.DB, orgId)).envVarsCiphertext
      : ciphertext
  if (!stored) return {}
  const value: unknown = JSON.parse(
    await decrypt(
      stored,
      orgEnvironmentContext(orgId),
      env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  )
  if (
    !isRecord(value) ||
    !Object.values(value).every((entry) => typeof entry === 'string')
  ) {
    throw new HttpError(
      409,
      'org_environment_unavailable',
      'The cloud computer settings could not load. Ask an org admin to save them again.',
    )
  }
  const result: Record<string, string> = {}
  for (const [name, entry] of Object.entries(value)) {
    if (typeof entry === 'string') result[name] = entry
  }
  return result
}

export function firstOrgAdmin(
  db: D1Database,
  orgId: string,
): Promise<{ userId: string } | null> {
  return db
    .prepare(
      `SELECT user_id AS userId FROM org_members JOIN orgs ON orgs.id = org_members.org_id
     WHERE org_id = ? AND role = 'admin' AND orgs.deleted_at IS NULL ORDER BY joined_at, user_id LIMIT 1`,
    )
    .bind(orgId)
    .first<{ userId: string }>()
}

export function firstActiveOrgAdmin(
  db: D1Database,
  orgId: string,
): Promise<{ userId: string } | null> {
  return db
    .prepare(
      `SELECT m.user_id AS userId FROM org_members m
       JOIN orgs o ON o.id = m.org_id
       JOIN users u ON u.id = m.user_id
       WHERE m.org_id = ? AND m.role = 'admin' AND o.deleted_at IS NULL
         AND u.suspended_at IS NULL
       ORDER BY m.joined_at, m.user_id LIMIT 1`,
    )
    .bind(orgId)
    .first<{ userId: string }>()
}
