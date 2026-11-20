import { activeOrgIdPredicate } from '../data/org-access'
import type { OpenProviderSwitch } from './provider-switch-data'
import {
  buildStarterActive,
  switchBuildFailureCause,
  switchMayPublish,
} from './provider-switch-end'

const endedSwitchBuild = `SELECT 1 FROM image_builds
  JOIN org_provider_switches s ON s.id = image_builds.operator_switch_id
  WHERE image_builds.id = ? AND image_builds.org_id = ? AND s.id = ?
    AND s.org_id = image_builds.org_id AND s.build_id = image_builds.id
    AND s.state = 'building' AND image_builds.state IN ('succeeded', 'failed')`

const targetPublished = `EXISTS (SELECT 1 FROM org_images image
  WHERE image.org_id = image_builds.org_id AND image.provider_account = s.to_account
    AND image.provider_account = image_builds.provider_account
    AND image.image_build_id = image_builds.id)`

export async function repairEndedProviderSwitch(
  db: D1Database,
  item: OpenProviderSwitch,
  now: number,
): Promise<boolean> {
  if (!item.buildId) return false
  const buildId = item.buildId
  const ended = await db
    .prepare(
      `SELECT completed_at AS completedAt, error FROM image_builds
      WHERE id = ? AND org_id = ? AND operator_switch_id = ?
        AND state IN ('succeeded', 'failed')`,
    )
    .bind(buildId, item.orgId, item.id)
    .first<{ completedAt: number | null; error: string | null }>()
  if (!ended) return false
  const scope = [buildId, item.orgId, item.id]
  await db.batch([
    db
      .prepare(
        `UPDATE image_build_jobs SET phase = 'cleanup'
        WHERE build_id = ? AND phase = 'cleanup-build' AND EXISTS (${endedSwitchBuild})`,
      )
      .bind(buildId, ...scope),
    db
      .prepare(
        `UPDATE orgs SET provider_account = ? WHERE id = ? AND provider_account = ?
        AND EXISTS (${endedSwitchBuild} AND image_builds.state = 'succeeded'
          AND ${targetPublished} AND ${switchMayPublish} AND ${buildStarterActive}
          AND ${activeOrgIdPredicate('image_builds.org_id')})`,
      )
      .bind(item.toAccount, item.orgId, item.fromAccount, ...scope),
    db
      .prepare(
        `UPDATE org_provider_switches SET state = 'completed', account_changed_at = ?,
        build_completed_at = ?, wait_reason = NULL, wait_job_id = NULL, failure_cause = NULL
        WHERE id = ? AND org_id = ? AND build_id = ? AND state = 'building' AND changes() = 1`,
      )
      .bind(now, ended.completedAt ?? now, item.id, item.orgId, buildId),
    db
      .prepare(
        `UPDATE org_images SET next_image_refresh_at = NULL, pending_push_refresh_at = NULL
        WHERE org_id = ? AND provider_account = ? AND changes() = 1
          AND EXISTS (SELECT 1 FROM org_provider_switches
            WHERE id = ? AND build_id = ? AND state = 'completed')`,
      )
      .bind(item.orgId, item.fromAccount, item.id, buildId),
    db
      .prepare(
        `UPDATE org_provider_switches SET state = 'failed', build_completed_at = ?,
        wait_reason = NULL, wait_job_id = NULL, failure_cause = ?
        WHERE id = ? AND org_id = ? AND build_id = ? AND state = 'building'
          AND EXISTS (${endedSwitchBuild}
            AND (image_builds.state = 'failed' OR NOT ${targetPublished}))`,
      )
      .bind(
        ended.completedAt ?? now,
        switchBuildFailureCause(ended.error),
        item.id,
        item.orgId,
        buildId,
        ...scope,
      ),
  ])
  return true
}
