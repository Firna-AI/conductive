import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'

export interface OrgImage {
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
      `SELECT org_id AS orgId, provider_account AS providerAccount,
       image_name AS imageName, image_build_id AS imageBuildId,
       last_refresh_at AS lastRefreshAt, last_push_refresh_at AS lastPushRefreshAt,
       pending_push_refresh_at AS pendingPushRefreshAt,
       next_image_refresh_at AS nextImageRefreshAt
       FROM org_images WHERE org_id = ? AND provider_account = ?`,
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
