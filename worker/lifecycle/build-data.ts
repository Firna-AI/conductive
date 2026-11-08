import type {
  BuildResponse,
  BuildsResponse,
  ImageBuild,
} from '../../src/shared/org-settings'
import { HttpError } from '../http'
import { RUNNER_PROTOCOL_VERSION } from '../../src/shared/runner'
import type { CommandStatus } from '../sandbox/provider'
import { readImageSoftware, type ImageSoftwareArtifact } from './image-software'
import type { SelectedRepository } from './settings-data'
import { readBuildSnapshot } from './build-log-reader'
import { buildLogStatements } from './build-log-statements'
import type { RepositoryLocation } from './repository-locations'
import { decodeBuildJob, type StoredBuildJob } from './build-job-codec'
import type { ProviderRetryState } from './provider-retry'
import { serializeSavedScript, type SavedScript } from './saved-script'

export type BuildPhase =
  | 'create'
  | 'sources'
  | 'software'
  | 'install'
  | 'snapshot'
  | 'publish'
  | 'cleanup'
  | 'done'

export interface BuildJob {
  providerRetry: ProviderRetryState | null
  startedAt: number
  buildId: string
  orgId: string
  kind: ImageBuild['kind']
  state: ImageBuild['state']
  sandboxId: string | null
  snapshotName: string | null
  settingsRevision: number
  startedByUserId: string | null
  phase: BuildPhase
  processId: number | null
  stdoutOffset: number
  stderrOffset: number
  installScript: SavedScript
  repositoriesJson: string
  repositoryLocationsJson: string | null
  previousRepositoryLocationsJson: string | null
  softwareJson: string
  previousImageName: string | null
}

const jobColumns = `b.id AS buildId, b.org_id AS orgId, b.kind, b.state, b.started_at AS startedAt,
  b.sandbox_id AS sandboxId, b.snapshot_name AS snapshotName,
  b.settings_revision AS settingsRevision, b.started_by_user_id AS startedByUserId,
  j.phase, j.process_id AS processId, j.stdout_offset AS stdoutOffset,
  j.stderr_offset AS stderrOffset, j.install_script AS installScript,
  j.repositories_json AS repositoriesJson, j.software_json AS softwareJson,
  j.repository_locations_json AS repositoryLocationsJson,
  j.previous_repository_locations_json AS previousRepositoryLocationsJson,
  j.previous_image_name AS previousImageName, b.provider_retry_json AS providerRetryJson`

const buildColumns = `id, org_id AS orgId, kind, state, started_at AS startedAt,
  completed_at AS completedAt, CASE WHEN completed_at IS NULL THEN NULL
  ELSE completed_at - started_at END AS durationMs, error`

export async function readBuildJob(
  db: D1Database,
  orgId: string,
  buildId: string,
): Promise<BuildJob> {
  const job = await db
    .prepare(
      `SELECT ${jobColumns} FROM image_builds b JOIN image_build_jobs j ON j.build_id = b.id
     WHERE b.org_id = ? AND b.id = ?`,
    )
    .bind(orgId, buildId)
    .first<StoredBuildJob>()
  if (!job)
    throw new HttpError(404, 'build_not_found', 'The build is not available.')
  return decodeBuildJob(job)
}

export async function runningBuild(
  db: D1Database,
  orgId: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      "SELECT id FROM image_builds WHERE org_id = ? AND state = 'running'",
    )
    .bind(orgId)
    .first<{ id: string }>()
  return row?.id ?? null
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
    now: number
    nextImageRefreshAt?: number
  },
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO image_builds (id, org_id, kind, state, settings_revision,
       runner_protocol_version, started_by_user_id, started_at)
       VALUES (?, ?, ?, 'running', ?, ?, ?, ?)`,
      )
      .bind(
        input.id,
        input.orgId,
        input.kind,
        input.settingsRevision,
        RUNNER_PROTOCOL_VERSION,
        input.userId,
        input.now,
      ),
    db
      .prepare(
        `INSERT INTO image_build_jobs (build_id, phase, install_script, repositories_json, software_json, previous_image_name,
          repository_locations_json, previous_repository_locations_json)
       VALUES (?, 'create', ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.id,
        serializeSavedScript(input.installScript),
        JSON.stringify(input.repositories),
        JSON.stringify(input.software),
        input.previousImageName,
        JSON.stringify(input.repositoryLocations),
        JSON.stringify(input.previousRepositoryLocations),
      ),
    ...(input.nextImageRefreshAt === undefined
      ? []
      : [
          db
            .prepare(
              'UPDATE settings SET next_image_refresh_at = ? WHERE org_id = ?',
            )
            .bind(input.nextImageRefreshAt, input.orgId),
        ]),
  ])
}

export async function updateBuildJob(
  db: D1Database,
  buildId: string,
  phase: BuildPhase,
  processId: number | null = null,
): Promise<void> {
  await db
    .prepare(
      'UPDATE image_build_jobs SET phase = ?, process_id = ?, stdout_offset = 0, stderr_offset = 0 WHERE build_id = ?',
    )
    .bind(phase, processId, buildId)
    .run()
}

export async function assignBuildSandbox(
  db: D1Database,
  buildId: string,
  sandboxId: string,
): Promise<void> {
  await db
    .prepare('UPDATE image_builds SET sandbox_id = ? WHERE id = ?')
    .bind(sandboxId, buildId)
    .run()
}

export async function assignBuildSnapshot(
  db: D1Database,
  buildId: string,
  snapshotName: string,
): Promise<void> {
  await db
    .prepare('UPDATE image_builds SET snapshot_name = ? WHERE id = ?')
    .bind(snapshotName, buildId)
    .run()
}

export async function saveBuildOutput(
  db: D1Database,
  buildId: string,
  status: CommandStatus,
  now: number,
): Promise<void> {
  await db.batch([
    ...[status.stdout, status.stderr]
      .filter(Boolean)
      .flatMap((text) => buildLogStatements(db, buildId, text, now)),
    db
      .prepare(
        'UPDATE image_build_jobs SET stdout_offset = ?, stderr_offset = ? WHERE build_id = ?',
      )
      .bind(status.stdoutNextOffset, status.stderrNextOffset, buildId),
  ])
}

export async function writeBuildLog(
  db: D1Database,
  buildId: string,
  text: string,
  now: number,
): Promise<void> {
  await db.batch(buildLogStatements(db, buildId, text, now))
}

export async function failBuild(
  db: D1Database,
  buildId: string,
  message: string,
  now: number,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        "UPDATE image_builds SET state = 'failed', completed_at = ?, error = ?, provider_retry_json = NULL WHERE id = ? AND state = 'running'",
      )
      .bind(now, message, buildId),
    ...buildLogStatements(db, buildId, message, now),
  ])
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
       next_image_refresh_at = ? WHERE org_id = ?`,
      )
      .bind(job.snapshotName, job.buildId, now, now + 86_400_000, job.orgId),
    db
      .prepare(
        "UPDATE image_builds SET state = 'succeeded', completed_at = ?, error = NULL, provider_retry_json = NULL WHERE id = ?",
      )
      .bind(now, job.buildId),
    db
      .prepare(
        "UPDATE image_build_jobs SET phase = 'cleanup', process_id = NULL WHERE build_id = ?",
      )
      .bind(job.buildId),
  ])
}

export async function readBuildHistory(
  db: D1Database,
  orgId: string,
): Promise<BuildsResponse> {
  const { results } = await db
    .prepare(
      `SELECT ${buildColumns} FROM image_builds WHERE org_id = ? ORDER BY started_at DESC, id DESC`,
    )
    .bind(orgId)
    .all<ImageBuild>()
  const settings = await db
    .prepare('SELECT image_build_id AS id FROM settings WHERE org_id = ?')
    .bind(orgId)
    .first<{ id: string | null }>()
  return { builds: results, currentImageBuildId: settings?.id ?? null }
}

export async function readBuild(
  db: D1Database,
  orgId: string,
  buildId: string,
): Promise<BuildResponse> {
  return readBuildSnapshot(db, orgId, buildId)
}

export function jobSoftware(job: BuildJob): ImageSoftwareArtifact {
  const value: unknown = JSON.parse(job.softwareJson)
  return readImageSoftware(value)
}
