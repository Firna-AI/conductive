import type { ImageBuild } from '../../src/shared/org-settings'
import { TEST_TIME } from '../test-support/harness'
import type { backendFixture } from './backend-test-support'
import { SECONDARY_IMAGE_ACCOUNT } from './org-image-account-test-support'

type Fixture = Awaited<ReturnType<typeof backendFixture>>

export async function seedVisibilityBuild(
  fixture: Fixture,
  input: {
    id: string
    state: ImageBuild['state']
    now: number
    hidden?: boolean
    kind?: ImageBuild['kind']
    orgId?: string
    sourceBuildId?: string
    installScript?: string
  },
): Promise<void> {
  const db = fixture.images.env.DB
  const orgId = input.orgId ?? fixture.org.id
  const switchId = input.hidden ? `switch-${input.id}` : null
  const providerAccount = input.hidden ? SECONDARY_IMAGE_ACCOUNT : 'boat'
  if (switchId) {
    await db
      .prepare(
        `INSERT INTO org_provider_switches
         (id, org_id, from_account, to_account, requested_at, operator_user_id, state)
         VALUES (?, ?, 'boat', ?, ?, ?, ?)`,
      )
      .bind(
        switchId,
        orgId,
        providerAccount,
        input.now,
        fixture.user.id,
        input.state === 'running'
          ? 'building'
          : input.state === 'failed'
            ? 'failed'
            : 'completed',
      )
      .run()
  }
  await db.batch([
    db
      .prepare(
        `INSERT INTO image_builds
         (id, org_id, kind, state, snapshot_name, settings_revision,
          runner_protocol_version, started_at, completed_at, provider_account, operator_switch_id)
         SELECT ?, ?, ?, ?, ?, settings_revision, runner_protocol_version, ?, ?, ?, ?
         FROM image_builds WHERE id = ?`,
      )
      .bind(
        input.id,
        orgId,
        input.kind ?? 'build',
        input.state,
        input.state === 'succeeded' ? `snapshot-${input.id}` : null,
        input.now,
        input.state === 'running' ? null : input.now + 1,
        providerAccount,
        switchId,
        input.sourceBuildId ?? 'published-image',
      ),
    db
      .prepare(
        `INSERT INTO image_build_jobs
         (build_id, phase, install_script, repositories_json, software_json,
          repository_locations_json, provider_account)
         SELECT ?, ?, COALESCE(?, install_script), repositories_json, software_json,
          repository_locations_json, ? FROM image_build_jobs WHERE build_id = ?`,
      )
      .bind(
        input.id,
        input.state === 'running' ? 'create' : 'done',
        input.installScript ?? null,
        providerAccount,
        input.sourceBuildId ?? 'published-image',
      ),
    db
      .prepare(
        `INSERT INTO image_build_logs (build_id, event_number, occurred_at, text)
         VALUES (?, 1, ?, 'private build output')`,
      )
      .bind(input.id, TEST_TIME),
    db
      .prepare('UPDATE org_provider_switches SET build_id = ? WHERE id = ?')
      .bind(input.id, switchId),
  ])
}

export async function publishVisibilityBuild(
  fixture: Fixture,
  buildId: string,
): Promise<void> {
  const db = fixture.images.env.DB
  await db.batch([
    db
      .prepare(
        `INSERT INTO org_images (org_id, provider_account, image_name, image_build_id)
         SELECT org_id, provider_account, snapshot_name, id FROM image_builds WHERE id = ?
         ON CONFLICT (org_id, provider_account) DO UPDATE SET
           image_name = excluded.image_name, image_build_id = excluded.image_build_id`,
      )
      .bind(buildId),
    db
      .prepare(
        `UPDATE orgs SET provider_account =
           (SELECT provider_account FROM image_builds WHERE id = ?)
         WHERE id = ?`,
      )
      .bind(buildId, fixture.org.id),
  ])
}
