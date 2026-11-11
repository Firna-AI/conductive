import type { ImageBuild } from '../../src/shared/org-settings'
import { HttpError } from '../http'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { readOrgImage } from './org-image-data'
import type { CommandStatus } from '../sandbox/provider'
import { readImageSoftware, type ImageSoftwareArtifact } from './image-software'
import { readBuildSnapshot } from './build-log-reader'
import { buildLogStatements } from './build-log-statements'
import { decodeBuildJob, type StoredBuildJob } from './build-job-codec'
import type { ProviderRetryState } from './provider-retry'
import type { SavedScript } from './saved-script'
import { readBuildChanges } from './build-changes-data'
import type {
  BuildWithCause,
  BuildsWithCauses,
  ImageVersions,
  RecordedImageBuild,
  RefreshCause,
} from './image-records'

export type BuildPhase =
  | 'create'
  | 'allocating'
  | 'sources'
  | 'software'
  | 'install'
  | 'snapshot'
  | 'publish'
  | 'cleanup'
  | 'cleanup-build'
  | 'done'

export interface BuildJob extends ImageVersions {
  providerRetry: ProviderRetryState | null
  startedAt: number
  buildId: string
  orgId: string
  providerAccount: string
  kind: ImageBuild['kind']
  refreshCause: RefreshCause | null
  state: ImageBuild['state']
  sandboxId: string | null
  snapshotName: string | null
  settingsRevision: number
  runnerProtocolVersion: number
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
  softwareImageName: string | null
  previousProviderAccount: string
}

const jobColumns = `b.id AS buildId, b.org_id AS orgId, b.kind, b.refresh_cause AS refreshCause,
  b.state, b.started_at AS startedAt,
  b.sandbox_id AS sandboxId, b.snapshot_name AS snapshotName,
  b.provider_account AS providerAccount,
  b.settings_revision AS settingsRevision, b.runner_protocol_version AS runnerProtocolVersion,
  b.started_by_user_id AS startedByUserId,
  j.phase, j.process_id AS processId, j.stdout_offset AS stdoutOffset,
  j.stderr_offset AS stderrOffset, j.install_script AS installScript,
  j.repositories_json AS repositoriesJson, j.software_json AS softwareJson,
  j.repository_locations_json AS repositoryLocationsJson,
  j.previous_repository_locations_json AS previousRepositoryLocationsJson,
  j.previous_image_name AS previousImageName, j.software_image_name AS softwareImageName,
  COALESCE(b.software_version, j.software_version) AS softwareVersion,
  COALESCE(b.install_script_revision, j.install_script_revision) AS installScriptRevision,
  j.provider_account AS previousProviderAccount,
  b.provider_retry_json AS providerRetryJson`

const buildColumns = `id, org_id AS orgId, kind, refresh_cause AS refreshCause, state, started_at AS startedAt,
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

export async function readLatestGoodBuild(
  db: D1Database,
  orgId: string,
  providerAccount: string,
): Promise<BuildJob | null> {
  const row = await db
    .prepare(
      `SELECT id FROM image_builds WHERE org_id = ? AND provider_account = ?
       AND kind = 'build' AND state = 'succeeded'
       ORDER BY started_at DESC, id DESC LIMIT 1`,
    )
    .bind(orgId, providerAccount)
    .first<{ id: string }>()
  return row ? readBuildJob(db, orgId, row.id) : null
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
  providerAccount: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE image_builds SET sandbox_id = ?, provider_account = ? WHERE id = ?',
    )
    .bind(sandboxId, providerAccount, buildId)
    .run()
}

export async function assignBuildSnapshot(
  db: D1Database,
  buildId: string,
  snapshotName: string,
  providerAccount: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE image_builds SET snapshot_name = ?, provider_account = ? WHERE id = ?',
    )
    .bind(snapshotName, providerAccount, buildId)
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

export async function readBuildHistory(
  db: D1Database,
  orgId: string,
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
): Promise<BuildsWithCauses> {
  const { results } = await db
    .prepare(
      `SELECT ${buildColumns} FROM image_builds WHERE org_id = ? ORDER BY started_at DESC, id DESC`,
    )
    .bind(orgId)
    .all<RecordedImageBuild>()
  const image = await readOrgImage(db, orgId, providerAccount)
  return {
    builds: results,
    currentImageBuildId: image?.imageBuildId ?? null,
    changes: await readBuildChanges(db, orgId, providerAccount),
  }
}

export async function readBuild(
  db: D1Database,
  orgId: string,
  buildId: string,
): Promise<BuildWithCause> {
  return readBuildSnapshot(db, orgId, buildId)
}

export function jobSoftware(job: BuildJob): ImageSoftwareArtifact {
  const value: unknown = JSON.parse(job.softwareJson)
  return readImageSoftware(value)
}
