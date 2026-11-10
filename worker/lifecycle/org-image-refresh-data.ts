import { activeOrgIdPredicate, activeOrgPredicate } from '../data/org-access'

export async function pushedImageRepositories(
  db: D1Database,
  input: { githubRepositoryId: number; installationId?: number },
): Promise<
  { orgId: string; providerAccount: string; defaultBranch: string }[]
> {
  const { results } = await db
    .prepare(
      `SELECT r.org_id AS orgId, image.provider_account AS providerAccount,
       json_extract(entry.value, '$.defaultBranch') AS defaultBranch
       FROM org_images image JOIN image_builds b ON b.id = COALESCE(image.image_build_id,
         (SELECT id FROM image_builds WHERE org_id = image.org_id AND state = 'running'
          AND provider_account = image.provider_account))
         AND b.org_id = image.org_id AND b.provider_account = image.provider_account
       JOIN image_build_jobs j ON j.build_id = b.id
       JOIN json_each(j.repositories_json) entry
       JOIN repositories r ON r.id = json_extract(entry.value, '$.id') AND r.org_id = image.org_id
       JOIN orgs ON orgs.id = r.org_id
       WHERE image.provider_account = orgs.provider_account AND r.github_repository_id = ?
       AND orgs.deleted_at IS NULL AND ${activeOrgPredicate('orgs')}
       AND (? IS NULL OR EXISTS (SELECT 1 FROM github_installations i
         WHERE i.id = r.installation_id AND i.id = ? AND i.suspended_at IS NULL))`,
    )
    .bind(
      input.githubRepositoryId,
      input.installationId ?? null,
      input.installationId ?? null,
    )
    .all<{ orgId: string; providerAccount: string; defaultBranch: string }>()
  return results
}

export async function markPendingPushRefresh(
  db: D1Database,
  orgId: string,
  providerAccount: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE org_images SET pending_push_refresh_at = COALESCE(pending_push_refresh_at, ?)
       WHERE org_id = ? AND provider_account = ? AND ${activeOrgIdPredicate('org_images.org_id')}`,
    )
    .bind(now, orgId, providerAccount)
    .run()
}

export async function claimPushRefresh(
  db: D1Database,
  orgId: string,
  providerAccount: string,
  now: number,
  cutoff: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE org_images SET last_push_refresh_at = ?, pending_push_refresh_at = NULL
       WHERE org_id = ? AND provider_account = ?
       AND image_name IS NOT NULL AND ${activeOrgIdPredicate('org_images.org_id')}
       AND (last_push_refresh_at IS NULL OR last_push_refresh_at <= ?)`,
    )
    .bind(now, orgId, providerAccount, cutoff)
    .run()
  return result.meta.changes === 1
}

export async function consumePendingPushRefresh(
  db: D1Database,
  orgId: string,
  providerAccount: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE org_images SET pending_push_refresh_at = NULL, last_push_refresh_at = ?
       WHERE org_id = ? AND provider_account = ? AND ${activeOrgIdPredicate('org_images.org_id')}`,
    )
    .bind(now, orgId, providerAccount)
    .run()
}
