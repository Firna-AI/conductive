import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  acquireCleanupLease,
  cleanupResources,
  markOrgDeleted,
  markResourceRemoved,
  markResourceStopped,
  recordSuspendedResources,
} from './deletion-data'
import { deletionFixture } from './deletion-test-support'
import { claimLifecycleGeneration } from './lifecycle-data'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('records resource accounts during org deletion and marks only the matching account', async () => {
  const { org, admin } = await deletionFixture(harness)
  const db = harness.env.DB
  await db.batch([
    db
      .prepare(
        "UPDATE workspaces SET sandbox_id = 'shared-sandbox', provider_account = 'boat' WHERE org_id = ?",
      )
      .bind(org.id),
    db.prepare(
      `UPDATE image_builds SET sandbox_id = 'shared-sandbox',
       provider_account = 'boat-second' WHERE id = 'build-one'`,
    ),
    db
      .prepare(
        `UPDATE org_images SET image_name = 'build-image', image_build_id = NULL
         WHERE org_id = ? AND provider_account = 'boat'`,
      )
      .bind(org.id),
    db
      .prepare(
        `INSERT INTO org_images (org_id, provider_account, image_name)
         VALUES (?, 'boat-second', 'org-image')`,
      )
      .bind(org.id),
    db
      .prepare(
        `INSERT INTO lifecycle_sandbox_cleanup
       (workspace_id, org_id, sandbox_id, provider_account)
       VALUES ('failed-create', ?, 'cleanup-sandbox', 'boat-second')`,
      )
      .bind(org.id),
  ])
  expect(await markOrgDeleted(db, org.id, admin.user.id, TEST_TIME)).toBe(true)
  await acquireCleanupLease(db, org.id, 'cleanup-lease', TEST_TIME)
  const generation = await claimLifecycleGeneration(
    db,
    org.id,
    'cleanup-lease',
    TEST_TIME,
  )
  if (generation === null) throw new Error('Missing cleanup generation')
  expect(
    await recordSuspendedResources(
      db,
      org.id,
      'cleanup-lease',
      generation,
      TEST_TIME,
    ),
  ).toBe(true)
  expect(await cleanupResources(db, org.id)).toEqual([
    {
      kind: 'snapshot',
      id: 'build-image',
      providerAccount: 'boat',
      stoppedAt: null,
      removedAt: null,
    },
    {
      kind: 'snapshot',
      id: 'build-image',
      providerAccount: 'boat-second',
      stoppedAt: null,
      removedAt: null,
    },
    {
      kind: 'snapshot',
      id: 'org-image',
      providerAccount: 'boat-second',
      stoppedAt: null,
      removedAt: null,
    },
    {
      kind: 'sandbox',
      id: 'shared-sandbox',
      providerAccount: 'boat',
      stoppedAt: null,
      removedAt: null,
    },
    {
      kind: 'sandbox',
      id: 'cleanup-sandbox',
      providerAccount: 'boat-second',
      stoppedAt: null,
      removedAt: null,
    },
    {
      kind: 'sandbox',
      id: 'shared-sandbox',
      providerAccount: 'boat-second',
      stoppedAt: null,
      removedAt: null,
    },
  ])
  expect(
    await markResourceStopped(
      db,
      org.id,
      'shared-sandbox',
      'boat-second',
      TEST_TIME,
    ),
  ).toBe(true)
  await markResourceRemoved(
    db,
    org.id,
    {
      kind: 'sandbox',
      id: 'shared-sandbox',
      providerAccount: 'boat-second',
      stoppedAt: TEST_TIME,
      removedAt: null,
    },
    TEST_TIME,
  )
  expect(
    await db
      .prepare('SELECT state FROM workspaces WHERE org_id = ?')
      .bind(org.id)
      .first('state'),
  ).toBe('working')
  expect(
    await db
      .prepare("SELECT state FROM image_builds WHERE id = 'build-one'")
      .first('state'),
  ).toBe('failed')
  expect(
    await db
      .prepare(
        `SELECT provider_account AS account, stopped_at AS stoppedAt, removed_at AS removedAt
       FROM org_deletion_resources WHERE org_id = ? AND resource_id = 'shared-sandbox'
       ORDER BY provider_account`,
      )
      .bind(org.id)
      .all(),
  ).toMatchObject({
    results: [
      { account: 'boat', stoppedAt: null, removedAt: null },
      { account: 'boat-second', stoppedAt: TEST_TIME, removedAt: TEST_TIME },
    ],
  })
})
