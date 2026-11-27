import type { ImageBuild } from '../../src/shared/org-settings'
import { RUNNER_PROTOCOL_VERSION } from '../../src/shared/runner'
import { activeOrgIdPredicate } from '../data/org-access'
import { requireActiveOrg } from '../data/user-access'
import type { BuildJob } from './build-data'
import type { SelectedRepository } from './settings-data'
import type { RepositoryLocation } from './repository-locations'
import type { ImageSoftwareArtifact } from './image-software'
import { serializeSavedScript, type SavedScript } from './saved-script'
import { writeBuildEnd } from './build-end-data'
import { clearBuildRequestsStatement } from './build-request'
import { endedSwitchRepairStatements } from './provider-switch-repair-data'
import {
  switchAdmission,
  switchAdmissionStatements,
  type SwitchBuildAdmission,
} from './build-switch-admission'

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
  input: SwitchBuildAdmission & {
    id: string
    orgId: string
    providerAccount: string
    previousProviderAccount: string
    kind: ImageBuild['kind']
    userId: string | null
    settingsRevision: number
    installScript: SavedScript
    repositories: readonly SelectedRepository[]
    repositoryLocations: readonly RepositoryLocation[]
    previousRepositoryLocations: readonly RepositoryLocation[]
    software: ImageSoftwareArtifact
    softwareVersion?: string
    previousImageName: string | null
    now: number
    nextImageRefreshAt?: number
  },
): Promise<boolean> {
  const admission = switchAdmission(input)
  const repair =
    !input.operatorSwitchId && input.expectedOrgAccount !== undefined
      ? endedSwitchRepairStatements(db, input.orgId, input.now)
      : []
  const result = await db.batch([
    ...repair,
    db
      .prepare(
        `INSERT INTO image_builds (id, org_id, kind, state, settings_revision,
       runner_protocol_version, started_by_user_id, started_at, provider_account,
       operator_switch_id, waiting_for_switch_id, execution_started_at)
       SELECT ?, ?, ?, 'running', ?, ?, ?, ?, ?, ?, ?, ?
       WHERE ${activeOrgIdPredicate('?')} ${admission.sql}`,
      )
      .bind(
        input.id,
        input.orgId,
        input.kind,
        input.settingsRevision,
        RUNNER_PROTOCOL_VERSION,
        input.userId,
        input.now,
        input.providerAccount,
        input.operatorSwitchId ?? null,
        input.waitingForSwitchId ?? null,
        input.waitingForSwitchId ? null : input.now,
        input.orgId,
        ...admission.values,
      ),
    db
      .prepare(
        `INSERT INTO image_build_jobs (build_id, phase, install_script, repositories_json, software_json, previous_image_name,
          repository_locations_json, previous_repository_locations_json, provider_account, software_image_name)
       SELECT ?, 'create', ?, ?, ?, ?, ?, ?, ?,
         (SELECT snapshot_name FROM software_images
          WHERE provider_account = ? AND version = ? AND state = 'ready'
          ORDER BY started_at DESC, id DESC LIMIT 1)
       WHERE EXISTS (SELECT 1 FROM image_builds WHERE id = ?)`,
      )
      .bind(
        input.id,
        serializeSavedScript(input.installScript),
        JSON.stringify(input.repositories),
        JSON.stringify(input.software),
        input.previousImageName,
        JSON.stringify(input.repositoryLocations),
        JSON.stringify(input.previousRepositoryLocations),
        input.previousProviderAccount,
        input.providerAccount,
        input.softwareVersion ?? null,
        input.id,
      ),
    db
      .prepare(
        `INSERT INTO org_images (org_id, provider_account, next_image_refresh_at)
         SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM image_builds WHERE id = ?)
         ON CONFLICT (org_id, provider_account) DO UPDATE
         SET next_image_refresh_at = COALESCE(excluded.next_image_refresh_at,
           org_images.next_image_refresh_at)`,
      )
      .bind(
        input.orgId,
        input.providerAccount,
        input.nextImageRefreshAt ?? null,
        input.id,
      ),
    ...(input.kind === 'build' && !input.operatorSwitchId
      ? [clearBuildRequestsStatement(db, input.orgId, input.id)]
      : []),
    ...switchAdmissionStatements(db, input),
  ])
  await requireActiveOrg(db, input.orgId)
  return result[repair.length].meta.changes === 1
}

export async function publishBuild(
  db: D1Database,
  job: BuildJob,
  now: number,
): Promise<void> {
  await writeBuildEnd(db, { state: 'succeeded', job }, now)
  await requireActiveOrg(db, job.orgId)
}
