import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { deleteOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { deletionFixture } from './deletion-test-support'
import { stopWorkspace } from './maintenance-test-support'
import { write } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.boat.addAccount({ orgId: 'second-org', apiKey: 'boat-second' })
  harness.env.SANDBOX_PROVIDER_ACCOUNTS = {
    'boat-second': { kind: 'boat', orgId: 'second-org', apiKey: 'boat-second' },
  }
})
afterAll(async () => {
  await harness.dispose()
})

function providerCalls() {
  return harness.boat.requests.map((request) => [
    request.method,
    new URL(request.url).pathname.replace('/api/v1', ''),
    request.headers.get('X-Boat-Org'),
    request.headers.get('Authorization'),
  ])
}

it('stops, retains, and purges each deleted-org resource through its stored account', async () => {
  const { org, admin, client } = await deletionFixture(harness)
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `UPDATE workspaces SET sandbox_id = 'shared-sandbox', provider_account = 'boat-second'
       WHERE id = 'workspace-one'`,
    ),
    harness.env.DB.prepare(
      "UPDATE image_builds SET sandbox_id = 'shared-sandbox' WHERE id = 'build-one'",
    ),
    harness.env.DB.prepare(
      `INSERT INTO image_builds (id, org_id, kind, state, snapshot_name, provider_account,
       settings_revision, runner_protocol_version, started_by_user_id, started_at, completed_at)
       VALUES ('published-second', ?, 'build', 'succeeded', 'org-image', 'boat-second', 1, 1, ?, ?, ?)`,
    ).bind(org.id, admin.user.id, TEST_TIME, TEST_TIME),
    harness.env.DB.prepare(
      `INSERT INTO org_images (org_id, provider_account, image_name, image_build_id)
       VALUES (?, 'boat-second', 'org-image', 'published-second')`,
    ).bind(org.id),
  ])
  await stopWorkspace(harness, 'workspace-one', 13)
  expect(
    (
      await client.request(
        deleteOrgPath(org.id),
        admin.session,
        write({ name: org.name }),
      )
    ).status,
  ).toBe(200)
  expect(providerCalls()).toEqual([
    [
      'POST',
      '/sandboxes/shared-sandbox/stop',
      'second-org',
      'Bearer boat-second',
    ],
    ['POST', '/sandboxes/shared-sandbox/stop', 'app-org', 'Bearer boat-first'],
  ])
  harness.boat.requests = []
  client.setTime(TEST_TIME + 23 * 3_600_000)
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [] })
  expect(providerCalls()).toEqual([
    [
      'POST',
      '/sandboxes/shared-sandbox/resume',
      'second-org',
      'Bearer boat-second',
    ],
    [
      'POST',
      '/sandboxes/shared-sandbox/stop',
      'second-org',
      'Bearer boat-second',
    ],
  ])
  harness.boat.requests = []
  client.setTime(TEST_TIME + 604_800_000)
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [org.id], pending: [] })
  expect(providerCalls()).toEqual([
    ['DELETE', '/saved-snapshots/build-image', 'app-org', 'Bearer boat-first'],
    ['DELETE', '/saved-snapshots/org-image', 'app-org', 'Bearer boat-first'],
    [
      'DELETE',
      '/saved-snapshots/org-image',
      'second-org',
      'Bearer boat-second',
    ],
    ['DELETE', '/sandboxes/shared-sandbox', 'second-org', 'Bearer boat-second'],
    ['DELETE', '/sandboxes/shared-sandbox', 'app-org', 'Bearer boat-first'],
  ])
})

it('keeps an unconfigured account pending without marking its resource removed', async () => {
  const { org, admin, client } = await deletionFixture(harness)
  expect(
    (
      await client.request(
        deleteOrgPath(org.id),
        admin.session,
        write({ name: org.name }),
      )
    ).status,
  ).toBe(200)
  await harness.env.DB.prepare(
    `UPDATE org_deletion_resources SET provider_account = 'missing-account'
     WHERE org_id = ? AND kind = 'snapshot' AND resource_id = 'build-image'`,
  )
    .bind(org.id)
    .run()
  harness.boat.requests = []
  client.setTime(TEST_TIME + 604_800_000)
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [org.id] })
  expect(
    await harness.env.DB.prepare(
      `SELECT removed_at AS removedAt FROM org_deletion_resources
       WHERE org_id = ? AND provider_account = 'missing-account'`,
    )
      .bind(org.id)
      .first(),
  ).toEqual({ removedAt: null })
  expect(
    await harness.env.DB.prepare('SELECT id FROM workspaces WHERE org_id = ?')
      .bind(org.id)
      .first(),
  ).toEqual({ id: 'workspace-one' })
  expect(providerCalls()).toEqual([
    ['DELETE', '/saved-snapshots/org-image', 'app-org', 'Bearer boat-first'],
  ])
})
