import { RUNNER_PROTOCOL_VERSION } from '../../src/shared/runner'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import type { ImageSoftwareArtifact } from './image-software'
import type { SelectedRepository } from './settings-data'
import {
  repositoryLocations,
  type RepositoryLocation,
} from './repository-locations'

/** Fixtures use a complete published record, as production image publication does. */
export async function seedPublishedImage(
  db: D1Database,
  input: {
    orgId: string
    buildId: string
    imageName: string
    providerAccount?: string
    repositories: readonly SelectedRepository[]
    software: ImageSoftwareArtifact
    now: number
    runnerProtocolVersion?: number
    locations?: readonly RepositoryLocation[] | null
  },
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO image_builds
       (id, org_id, kind, state, snapshot_name, settings_revision, runner_protocol_version, started_at, completed_at, provider_account)
       VALUES (?, ?, 'build', 'succeeded', ?, 1, ?, ?, ?, ?)`,
      )
      .bind(
        input.buildId,
        input.orgId,
        input.imageName,
        input.runnerProtocolVersion ?? RUNNER_PROTOCOL_VERSION,
        input.now,
        input.now,
        input.providerAccount ?? DEFAULT_PROVIDER_ACCOUNT,
      ),
    db
      .prepare(
        `INSERT INTO image_build_jobs
       (build_id, phase, install_script, repositories_json, software_json, repository_locations_json, provider_account)
       VALUES (?, 'done', '', ?, ?, ?, ?)`,
      )
      .bind(
        input.buildId,
        JSON.stringify(input.repositories),
        JSON.stringify(input.software),
        input.locations === null
          ? null
          : JSON.stringify(
              input.locations ?? repositoryLocations(input.repositories),
            ),
        input.providerAccount ?? DEFAULT_PROVIDER_ACCOUNT,
      ),
    db
      .prepare(
        `INSERT INTO org_images (org_id, provider_account, image_name, image_build_id)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (org_id, provider_account) DO UPDATE SET
           image_name = excluded.image_name, image_build_id = excluded.image_build_id`,
      )
      .bind(
        input.orgId,
        input.providerAccount ?? DEFAULT_PROVIDER_ACCOUNT,
        input.imageName,
        input.buildId,
      ),
  ])
}
