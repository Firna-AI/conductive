import { activeOrgIdPredicate } from '../data/org-access'
import type { BuildJob } from './build-data'
import { buildLogStatements } from './build-log-statements'
import {
  buildStarterActive,
  switchMayPublish,
  switchDidPublish,
  switchFailureStatements,
  switchPublicationStatements,
  type SwitchBuildFailure,
} from './provider-switch-end'
import {
  failedBuildStepsStatement,
  publishedBuildStepsStatement,
} from './build-step-data'

type BuildEnd =
  | ({ state: 'failed'; buildId: string; message: string } & SwitchBuildFailure)
  | { state: 'succeeded'; job: BuildJob }

const publishingBuild = `EXISTS (SELECT 1 FROM image_builds
  WHERE id = ? AND state = 'running'
    AND ${activeOrgIdPredicate('image_builds.org_id')}
    AND ${buildStarterActive} AND ${switchMayPublish})`

export async function writeBuildEnd(
  db: D1Database,
  end: BuildEnd,
  now: number,
): Promise<void> {
  const buildId = end.state === 'failed' ? end.buildId : end.job.buildId
  const activeOrg =
    end.state === 'succeeded'
      ? `AND ${activeOrgIdPredicate('image_builds.org_id')} AND ${buildStarterActive} AND ${switchDidPublish}`
      : ''
  // Side effects check running before the final update in the same atomic batch.
  await db.batch([
    ...(end.state === 'failed'
      ? [
          ...buildLogStatements(db, buildId, end.message, now, true),
          ...switchFailureStatements(db, buildId, now, end),
        ]
      : publicationStatements(db, end.job, now)),
    db
      .prepare(
        `UPDATE image_builds SET state = ?, completed_at = ?, error = ?, provider_retry_json = NULL
         WHERE id = ? AND state = 'running' ${activeOrg}`,
      )
      .bind(
        end.state,
        now,
        end.state === 'failed' ? end.message : null,
        buildId,
      ),
    // After the final update, so that the publish closes the steps only of a success.
    end.state === 'failed'
      ? failedBuildStepsStatement(db, buildId, now)
      : publishedBuildStepsStatement(db, buildId, now),
  ])
}

function publicationStatements(
  db: D1Database,
  job: BuildJob,
  now: number,
): D1PreparedStatement[] {
  return [
    db
      .prepare(
        `INSERT INTO org_images
         (org_id, provider_account, image_name, image_build_id, last_refresh_at, next_image_refresh_at)
         SELECT ?, ?, ?, ?, ?, ? WHERE ${publishingBuild}
         ON CONFLICT (org_id, provider_account) DO UPDATE SET
         image_name = excluded.image_name, image_build_id = excluded.image_build_id,
         last_refresh_at = excluded.last_refresh_at,
         next_image_refresh_at = excluded.next_image_refresh_at`,
      )
      .bind(
        job.orgId,
        job.providerAccount,
        job.snapshotName,
        job.buildId,
        now,
        now + 86_400_000,
        job.buildId,
      ),
    db
      .prepare(
        `UPDATE image_build_jobs SET phase = CASE WHEN
          (SELECT operator_switch_id FROM image_builds WHERE id = ?) IS NULL AND (
          (? IS NULL AND ? = 'build'
            AND EXISTS (SELECT 1 FROM settings WHERE org_id = ? AND revision > ?))
          OR (EXISTS (SELECT 1 FROM repositories r WHERE r.org_id = ? AND r.selected = 1
            AND NOT EXISTS (SELECT 1 FROM json_each(image_build_jobs.repositories_json) repository
              WHERE json_extract(repository.value, '$.id') = r.id))
            AND (SELECT CASE WHEN id = ? THEN 'succeeded' ELSE state END
              FROM image_builds WHERE org_id = ? AND provider_account = ? AND kind = 'build'
              ORDER BY started_at DESC, id DESC LIMIT 1) = 'succeeded')
          ) THEN 'cleanup-build' ELSE 'cleanup' END,
          process_id = NULL, command_route = NULL WHERE build_id = ? AND ${publishingBuild}`,
      )
      .bind(
        job.buildId,
        job.previousImageName,
        job.kind,
        job.orgId,
        job.settingsRevision,
        job.orgId,
        job.buildId,
        job.orgId,
        job.providerAccount,
        job.buildId,
        job.buildId,
      ),
    ...switchPublicationStatements(db, job.buildId, now, publishingBuild),
  ]
}
