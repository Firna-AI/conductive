import { readBuildJob } from './build-data'
import { readOrgImage } from './org-image-data'

export async function switchBuildInputs(
  db: D1Database,
  orgId: string,
  account: string,
) {
  const image = await readOrgImage(db, orgId, account)
  if (!image?.imageName || !image.imageBuildId) return null
  const published = await readBuildJob(db, orgId, image.imageBuildId)
  const full = await db
    .prepare(
      `SELECT id FROM image_builds WHERE org_id = ?
    AND provider_account = ? AND kind = 'build' AND state = 'succeeded'
    ORDER BY started_at DESC, id DESC LIMIT 1`,
    )
    .bind(orgId, account)
    .first<{ id: string }>()
  const installed = full ? await readBuildJob(db, orgId, full.id) : published
  return {
    ...published,
    installScript: installed.installScript,
    settingsRevision: installed.settingsRevision,
  }
}
