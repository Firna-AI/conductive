import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { stopOrgLifecycleRecords } from './composition-data'
import {
  acquireCleanupLease,
  markOrgDeleted,
  markResourceStopped,
  recordSuspendedResources,
} from './deletion-data'
import { deletionFixture } from './deletion-test-support'
import { claimLifecycleGeneration } from './lifecycle-data'
import { markDiskResumed } from './maintenance-data'
import { seedWorkspace } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => harness.reset())
afterAll(async () => harness.dispose())

it('clears deleted-org run times at stops and records the disk restart time', async () => {
  const { org, admin, member } = await deletionFixture(harness)
  const db = harness.env.DB
  await seedWorkspace(harness, org, member.user, 'pending', undefined, null)
  await db
    .prepare('UPDATE workspaces SET running_since = ? WHERE org_id = ?')
    .bind(TEST_TIME - 1_000, org.id)
    .run()
  await markOrgDeleted(db, org.id, admin.user.id, TEST_TIME)
  await acquireCleanupLease(db, org.id, 'lease', TEST_TIME)
  const generation = await claimLifecycleGeneration(
    db,
    org.id,
    'lease',
    TEST_TIME,
  )
  if (generation === null) throw new Error('Missing deletion generation')
  await recordSuspendedResources(db, org.id, 'lease', generation, TEST_TIME)
  const read = (id: string) =>
    db
      .prepare(
        'SELECT state, running_since AS runningSince FROM workspaces WHERE id = ?',
      )
      .bind(id)
      .first()

  await stopOrgLifecycleRecords(db, org.id, generation, TEST_TIME)
  expect(await read('pending')).toEqual({
    state: 'stopped',
    runningSince: null,
  })
  expect(await read('workspace-one')).toEqual({
    state: 'working',
    runningSince: TEST_TIME - 1_000,
  })
  const ownership = { token: 'lease', generation }
  await markResourceStopped(
    db,
    org.id,
    'sandbox-workspace-one',
    'boat',
    TEST_TIME,
    ownership,
  )
  expect(await read('workspace-one')).toEqual({
    state: 'stopped',
    runningSince: null,
  })

  expect(
    await markDiskResumed(
      db,
      org.id,
      'workspace-one',
      'sandbox-workspace-one',
      'boat',
      'lease',
      generation,
      TEST_TIME + 100,
    ),
  ).toBe(true)
  expect(await read('workspace-one')).toEqual({
    state: 'starting',
    runningSince: TEST_TIME + 100,
  })
  await markResourceStopped(
    db,
    org.id,
    'sandbox-workspace-one',
    'boat',
    TEST_TIME + 200,
    ownership,
  )
  expect(await read('workspace-one')).toEqual({
    state: 'stopped',
    runningSince: null,
  })
})
