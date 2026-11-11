import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import type { ImageVersions } from './image-records'

export interface OrgImage extends ImageVersions {
  orgId: string
  providerAccount: string
  imageName: string | null
  imageBuildId: string | null
  lastRefreshAt: number | null
  lastPushRefreshAt: number | null
  pendingPushRefreshAt: number | null
  nextImageRefreshAt: number | null
}

export function readOrgImage(
  db: D1Database,
  orgId: string,
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
): Promise<OrgImage | null> {
  return db
    .prepare(
      `SELECT i.org_id AS orgId, i.provider_account AS providerAccount,
       i.image_name AS imageName, i.image_build_id AS imageBuildId,
       i.last_refresh_at AS lastRefreshAt, i.last_push_refresh_at AS lastPushRefreshAt,
       i.pending_push_refresh_at AS pendingPushRefreshAt,
       i.next_image_refresh_at AS nextImageRefreshAt,
       b.software_version AS softwareVersion, b.install_script_revision AS installScriptRevision
       FROM org_images i LEFT JOIN image_builds b ON b.id = i.image_build_id
         AND b.org_id = i.org_id AND b.provider_account = i.provider_account
         AND b.snapshot_name = i.image_name AND b.state = 'succeeded'
       WHERE i.org_id = ? AND i.provider_account = ?`,
    )
    .bind(orgId, providerAccount)
    .first<OrgImage>()
}

export async function imageIsPublished(
  db: D1Database,
  imageName: string,
  providerAccount: string,
): Promise<boolean> {
  return Boolean(
    await db
      .prepare(
        `SELECT 1 FROM org_images
         WHERE provider_account = ? AND image_name = ? LIMIT 1`,
      )
      .bind(providerAccount, imageName)
      .first(),
  )
}
