import { activeOrgIdPredicate } from '../data/org-access'
import {
  buildStarterActive,
  switchFailureMessages,
  switchMayPublish,
} from './provider-switch-end'

/** These statements also resolve the account inside member admission and promotion. */
export function endedSwitchRepairStatements(
  db: D1Database,
  orgId: string,
  now: number,
  attempt?: { id: string; buildId: string },
): D1PreparedStatement[] {
  const attemptScope = `s.org_id = ? AND image_builds.org_id = s.org_id
    AND image_builds.id = s.build_id AND image_builds.operator_switch_id = s.id
    ${attempt ? 'AND s.id = ? AND s.build_id = ?' : ''}`
  const scope = `${attemptScope} AND s.state = 'building'
    AND image_builds.state IN ('succeeded', 'failed')`
  const values = [orgId, ...(attempt ? [attempt.id, attempt.buildId] : [])]
  const targetPublished = `EXISTS (SELECT 1 FROM org_images image
    WHERE image.org_id = image_builds.org_id AND image.provider_account = s.to_account
      AND image.provider_account = image_builds.provider_account
      AND image.image_build_id = image_builds.id)`
  const wait = `CASE
    WHEN o.provider_account != s.from_account THEN NULL
    WHEN o.deleted_at IS NOT NULL THEN 'deleted'
    WHEN o.suspended_at IS NOT NULL THEN 'suspended'
    WHEN NOT ${buildStarterActive} THEN 'admin'
    ELSE NULL END`
  return [
    db
      .prepare(
        `UPDATE image_build_jobs SET phase = 'cleanup'
        WHERE phase = 'cleanup-build' AND EXISTS (SELECT 1 FROM image_builds
          JOIN org_provider_switches s ON s.id = image_builds.operator_switch_id
          WHERE image_builds.id = image_build_jobs.build_id AND ${scope})`,
      )
      .bind(...values),
    db
      .prepare(
        `UPDATE orgs SET provider_account = s.to_account
        FROM org_provider_switches s JOIN image_builds ON image_builds.id = s.build_id
        WHERE orgs.id = s.org_id AND orgs.provider_account = s.from_account
          AND ${scope} AND image_builds.state = 'succeeded' AND ${targetPublished}
          AND ${switchMayPublish} AND ${buildStarterActive}
          AND ${activeOrgIdPredicate('image_builds.org_id')}`,
      )
      .bind(...values),
    db
      .prepare(
        `UPDATE org_provider_switches SET state = 'completed', account_changed_at = ?,
        build_completed_at = COALESCE((SELECT completed_at FROM image_builds
          WHERE id = org_provider_switches.build_id), ?),
        wait_reason = NULL, wait_job_id = NULL, failure_cause = NULL
        WHERE changes() = 1 AND EXISTS (SELECT 1 FROM image_builds
          JOIN org_provider_switches s ON s.id = image_builds.operator_switch_id
          WHERE s.id = org_provider_switches.id AND ${scope})`,
      )
      .bind(now, now, ...values),
    db
      .prepare(
        `UPDATE org_images SET next_image_refresh_at = NULL, pending_push_refresh_at = NULL
        WHERE changes() = 1 AND EXISTS (SELECT 1 FROM image_builds
          JOIN org_provider_switches s ON s.id = image_builds.operator_switch_id
          WHERE s.org_id = org_images.org_id AND s.from_account = org_images.provider_account
            AND s.state = 'completed' AND ${attemptScope})`,
      )
      .bind(...values),
    db
      .prepare(
        `UPDATE org_provider_switches AS s SET
        state = CASE WHEN (${wait}) IS NULL THEN 'failed' ELSE 'waiting' END,
        wait_reason = (${wait}), wait_job_id = NULL,
        build_completed_at = COALESCE(image_builds.completed_at, ?),
        failure_cause = CASE WHEN (${wait}) IS NULL THEN CASE image_builds.error
          WHEN ? THEN 'time-limit' WHEN ? THEN 'provider' ELSE 'script' END ELSE NULL END
        FROM image_builds JOIN orgs o ON o.id = image_builds.org_id
        WHERE ${scope}`,
      )
      .bind(
        now,
        switchFailureMessages['time-limit'],
        switchFailureMessages.provider,
        ...values,
      ),
  ]
}
