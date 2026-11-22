import { SOFTWARE } from '../lifecycle/backend-test-support'
import { seedPublishedImage } from '../lifecycle/published-image-test-support'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { seedBuild } from './overview.test-support'
import { withSoftwareRelease } from '../lifecycle/software-release-test-support'

export async function seedSwitchImage(
  harness: TestHarness,
  orgId: string,
  account = 'boat',
  buildId = 'source-build',
) {
  harness.env.WORKSPACES = harness.native.bindings.WORKSPACES
  harness.github.fetch = withSoftwareRelease(harness.github.fetch)
  await harness.env.DB.prepare(
    'INSERT OR IGNORE INTO settings (org_id, updated_at) VALUES (?, ?)',
  )
    .bind(orgId, TEST_TIME)
    .run()
  await seedPublishedImage(harness.env.DB, {
    orgId,
    providerAccount: account,
    buildId,
    imageName: 'good-image',
    repositories: [
      {
        id: `repo-${orgId}`,
        orgId,
        fullName: 'example/repo',
        defaultBranch: 'main',
      },
    ],
    software: SOFTWARE,
    now: TEST_TIME - 1,
  })
}

export async function seedSwitchBlockingJob(
  harness: TestHarness,
  orgId: string,
  id = 'blocking-build',
) {
  harness.env.WORKSPACES = harness.native.bindings.WORKSPACES
  await seedBuild(harness, {
    id,
    orgId,
    kind: 'build',
    state: 'running',
    phase: 'create',
  })
}

export async function makeRecordedSwitchBuild(
  harness: TestHarness,
  orgId: string,
) {
  await harness.env.DB.prepare(
    "UPDATE image_builds SET state = 'failed' WHERE id = 'blocking-build'",
  ).run()
  await harness.env.DB.prepare(
    "UPDATE image_build_jobs SET phase = 'done' WHERE build_id = 'blocking-build'",
  ).run()
  await seedBuild(harness, {
    id: 'recorded-switch-build',
    orgId,
    kind: 'build',
    state: 'running',
    phase: 'create',
  })
  await harness.env.DB.prepare(
    "UPDATE image_build_jobs SET software_json = ? WHERE build_id = 'recorded-switch-build'",
  )
    .bind(JSON.stringify(SOFTWARE))
    .run()
  await harness.env.DB.prepare(
    `UPDATE image_builds SET provider_account = 'e2b',
    operator_switch_id = (SELECT id FROM org_provider_switches WHERE org_id = ? AND state = 'waiting')
    WHERE id = 'recorded-switch-build'`,
  )
    .bind(orgId)
    .run()
  await harness.env.DB.prepare(
    `UPDATE org_provider_switches SET state = 'building',
    build_id = 'recorded-switch-build', build_started_at = ?, wait_reason = NULL,
    wait_job_id = NULL WHERE org_id = ? AND state = 'waiting'`,
  )
    .bind(TEST_TIME, orgId)
    .run()
}
