import type { ImageBuild } from '../../src/shared/org-settings'
import { RUNNER_PROTOCOL_VERSION } from '../../src/shared/runner'
import { activeOrgIdPredicate } from '../data/org-access'
import { requireActiveOrg } from '../data/user-access'
import type { BuildJob } from './build-data'
import type { SelectedRepository } from './settings-data'
import type { RepositoryLocation } from './repository-locations'
import type { ImageSoftwareArtifact } from './image-software'
import { serializeSavedScript, type SavedScript } from './saved-script'

export async function finishUnscheduledBuild(
  db: D1Database,
  buildId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE image_build_jobs SET phase = CASE
       WHEN phase = 'create' AND EXISTS (SELECT 1 FROM image_builds
         WHERE id = image_build_jobs.build_id AND sandbox_id IS NULL AND snapshot_name IS NULL)
         THEN 'done'
       WHEN phase = 'allocating' AND EXISTS (SELECT 1 FROM image_builds
         WHERE id = image_build_jobs.build_id AND sandbox_id IS NULL) THEN 'allocating'
       ELSE 'cleanup' END
       WHERE build_id = ? AND phase != 'done'
     AND EXISTS (SELECT 1 FROM image_builds WHERE id = image_build_jobs.build_id
       AND state = 'failed')`,
    )
    .bind(buildId)
    .run()
}

export async function insertBuild(
  db: D1Database,
  input: {
    id: string
    orgId: string
    kind: ImageBuild['kind']
    userId: string | null
    settingsRevision: number
    installScript: SavedScript
    repositories: readonly SelectedRepository[]
    repositoryLocations: readonly RepositoryLocation[]
    previousRepositoryLocations: readonly RepositoryLocation[]
    software: ImageSoftwareArtifact
    previousImageName: string | null
    previousRunnerProtocolVersion: number | null
    now: number
    nextImageRefreshAt?: number
  },
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO image_builds (id, org_id, kind, state, settings_revision,
       runner_protocol_version, started_by_user_id, started_at)
       SELECT ?, ?, ?, 'running', ?, ?, ?, ? WHERE ${activeOrgIdPredicate('?')}`,
      )
      .bind(
        input.id,
        input.orgId,
        input.kind,
        input.settingsRevision,
        input.kind === 'refresh'
          ? (input.previousRunnerProtocolVersion ?? 1)
          : RUNNER_PROTOCOL_VERSION,
        input.userId,
        input.now,
        input.orgId,
      ),
    db
      .prepare(
        `INSERT INTO image_build_jobs (build_id, phase, install_script, repositories_json, software_json, previous_image_name,
          repository_locations_json, previous_repository_locations_json)
       SELECT ?, 'create', ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM image_builds WHERE id = ?)`,
      )
      .bind(
        input.id,
        serializeSavedScript(input.installScript),
        JSON.stringify(input.repositories),
        JSON.stringify(input.software),
        input.previousImageName,
        JSON.stringify(input.repositoryLocations),
        JSON.stringify(input.previousRepositoryLocations),
        input.id,
      ),
    ...(input.nextImageRefreshAt === undefined
      ? []
      : [
          db
            .prepare(
              `UPDATE settings SET next_image_refresh_at = ? WHERE org_id = ? AND ${activeOrgIdPredicate('settings.org_id')}`,
            )
            .bind(input.nextImageRefreshAt, input.orgId),
        ]),
  ])
  await requireActiveOrg(db, input.orgId)
}

export async function publishBuild(
  db: D1Database,
  job: BuildJob,
  now: number,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `UPDATE settings SET org_image_name = ?, image_build_id = ?, last_refresh_at = ?,
       next_image_refresh_at = ? WHERE org_id = ? AND ${activeOrgIdPredicate('settings.org_id')}`,
      )
      .bind(job.snapshotName, job.buildId, now, now + 86_400_000, job.orgId),
    db
      .prepare(
        `UPDATE image_builds SET state = 'succeeded', completed_at = ?, error = NULL, provider_retry_json = NULL WHERE id = ? AND ${activeOrgIdPredicate('image_builds.org_id')}`,
      )
      .bind(now, job.buildId),
    db
      .prepare(
        `UPDATE image_build_jobs SET phase = CASE WHEN ? IS NULL AND ? = 'build'
          AND EXISTS (SELECT 1 FROM settings WHERE org_id = ? AND revision > ?)
          THEN 'cleanup-build' ELSE 'cleanup' END,
          process_id = NULL WHERE build_id = ? AND EXISTS
          (SELECT 1 FROM image_builds WHERE id = image_build_jobs.build_id AND state = 'succeeded')`,
      )
      .bind(
        job.previousImageName,
        job.kind,
        job.orgId,
        job.settingsRevision,
        job.buildId,
      ),
  ])
  await requireActiveOrg(db, job.orgId)
}
