import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import {
  seedSecondaryOrgImage,
  SECONDARY_IMAGE_ACCOUNT,
} from './org-image-account-test-support'
import { readOrgImage } from './org-image-data'
import { repairLifecycleAlarms } from './repair'
import { REPAIR_GRACE_MS } from './repair-data'

const fixtureForTest = setupBackendTests()

it('repairs only the fixed org account and leaves an older account image deadline untouched', async () => {
  const fixture = fixtureForTest()
  const { runtime, images, org, scheduled } = fixture
  const db = runtime.env.DB
  await seedSecondaryOrgImage(fixture)
  const oldDeadline = TEST_TIME + 86_400_000
  await db.batch([
    db
      .prepare('UPDATE orgs SET provider_account = ? WHERE id = ?')
      .bind(SECONDARY_IMAGE_ACCOUNT, org.id),
    db
      .prepare(
        'UPDATE org_images SET next_image_refresh_at = ? WHERE org_id = ?',
      )
      .bind(oldDeadline, org.id),
    db
      .prepare(
        'UPDATE org_images SET next_image_refresh_at = ? WHERE org_id = ? AND provider_account = ?',
      )
      .bind(TEST_TIME - REPAIR_GRACE_MS - 1, org.id, SECONDARY_IMAGE_ACCOUNT),
  ])
  expect(await repairLifecycleAlarms(runtime, images, () => SOFTWARE)).toEqual({
    workspaces: 0,
    orgs: 1,
    pendingWorkspaces: 0,
    pendingOrgs: 0,
  })
  expect(scheduled).toEqual([
    {
      orgId: org.id,
      providerAccount: SECONDARY_IMAGE_ACCOUNT,
      software: SOFTWARE,
      buildId: null,
      nextAt: TEST_TIME,
    },
  ])
  expect(await readOrgImage(db, org.id, SECONDARY_IMAGE_ACCOUNT)).toMatchObject(
    {
      nextImageRefreshAt: TEST_TIME,
    },
  )
  expect(await readOrgImage(db, org.id, 'boat')).toMatchObject({
    nextImageRefreshAt: oldDeadline,
  })
  expect(await repairLifecycleAlarms(runtime, images, () => SOFTWARE)).toEqual({
    workspaces: 0,
    orgs: 0,
    pendingWorkspaces: 0,
    pendingOrgs: 0,
  })
})
