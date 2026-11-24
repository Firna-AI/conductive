import type {
  BuildResponse,
  BuildsResponse,
  ImageBuild,
} from '../../src/shared/org-settings'
import { HttpError } from '../http'
import { readOrgProviderAccount } from '../data/org-provider-account'
import type { CommandStatus } from '../machines/channel'
import { readImageSoftware, type ImageSoftwareArtifact } from './image-software'
import { readBuildSnapshot } from './build-log-reader'
import { buildLogStatements } from './build-log-statements'
import { decodeBuildJob, type StoredBuildJob } from './build-job-codec'
import type { ProviderRetryState } from './provider-retry'
import type { SavedScript } from './saved-script'
import { readBuildChanges } from './build-changes-data'
import { writeBuildEnd } from './build-end-data'
import type { SwitchBuildFailure } from './provider-switch-end'

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

export interface BuildJob {
  providerRetry: ProviderRetryState | null
  startedAt: number
  executionStartedAt?: number | null
  operatorSwitchId?: string | null
  waitingForSwitchId?: string | null
  buildId: string
  orgId: string
  providerAccount: string
  kind: ImageBuild['kind']
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

const jobColumns = `b.id AS buildId, b.org_id AS orgId, b.kind, b.state, b.started_at AS startedAt,
  b.execution_started_at AS executionStartedAt, b.operator_switch_id AS operatorSwitchId,
  b.waiting_for_switch_id AS waitingForSwitchId,
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
  j.provider_account AS previousProviderAccount,
  b.provider_retry_json AS providerRetryJson`

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
      "SELECT id FROM image_builds WHERE org_id = ? AND state = 'running' AND waiting_for_switch_id IS NULL",
    )
    .bind(orgId)
    .first<{ id: string }>()
  return row?.id ?? null
}

/** The one statement of a phase change. It resets the command of the job. */
export function buildPhaseStatement(
  db: D1Database,
  buildId: string,
  phase: BuildPhase,
  processId: number | null = null,
): D1PreparedStatement {
  return db
    .prepare(
      'UPDATE image_build_jobs SET phase = ?, process_id = ?, stdout_offset = 0, stderr_offset = 0 WHERE build_id = ?',
    )
    .bind(phase, processId, buildId)
}

export async function updateBuildJob(
  db: D1Database,
  buildId: string,
  phase: BuildPhase,
  processId: number | null = null,
): Promise<void> {
  await buildPhaseStatement(db, buildId, phase, processId).run()
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

export function buildSnapshotStatement(
  db: D1Database,
  buildId: string,
  snapshotName: string,
  providerAccount: string,
): D1PreparedStatement {
  return db
    .prepare(
      'UPDATE image_builds SET snapshot_name = ?, provider_account = ? WHERE id = ?',
    )
    .bind(snapshotName, providerAccount, buildId)
}

export async function assignBuildSnapshot(
  db: D1Database,
  buildId: string,
  snapshotName: string,
  providerAccount: string,
): Promise<void> {
  await buildSnapshotStatement(db, buildId, snapshotName, providerAccount).run()
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
  records: readonly D1PreparedStatement[] = [],
): Promise<void> {
  await db.batch([...buildLogStatements(db, buildId, text, now), ...records])
}

export async function failBuild(
  db: D1Database,
  buildId: string,
  message: string,
  now: number,
  failure: SwitchBuildFailure = {},
): Promise<void> {
  await writeBuildEnd(
    db,
    { state: 'failed', buildId, message, ...failure },
    now,
  )
}

export async function readBuildHistory(
  db: D1Database,
  orgId: string,
): Promise<BuildsResponse> {
  const providerAccount = await readOrgProviderAccount(db, orgId)
  const { results } = await db
    .prepare(
      `SELECT ${buildColumns} FROM image_builds WHERE org_id = ?
       AND operator_switch_id IS NULL ORDER BY started_at DESC, id DESC`,
    )
    .bind(orgId)
    .all<ImageBuild>()
  const image = await db
    .prepare(
      `SELECT i.image_build_id AS imageBuildId, b.operator_switch_id AS operatorSwitchId
       FROM org_images i LEFT JOIN image_builds b ON b.id = i.image_build_id
       WHERE i.org_id = ? AND i.provider_account = ?`,
    )
    .bind(orgId, providerAccount)
    .first<{ imageBuildId: string | null; operatorSwitchId: string | null }>()
  return {
    builds: results,
    currentImageBuildId:
      image && image.operatorSwitchId !== null
        ? (results.find((build) => build.state === 'succeeded')?.id ?? null)
        : (image?.imageBuildId ?? null),
    changes: await readBuildChanges(db, orgId, providerAccount),
  }
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
