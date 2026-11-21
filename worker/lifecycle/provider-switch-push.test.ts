import { afterEach, expect, it, vi } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { readBuildJob } from './build-data'
import { finishImageBuild } from './image-test-support'
import { progressProviderSwitch } from './provider-switch-builds'
import { refreshImagesForPush, runImageAlarm } from './image-timers'
import { readOrgImage } from './org-image-data'
import { imageHoldsOldValues } from './org-image-refresh-data'
import * as refreshData from './org-image-refresh-data'
import {
  setupSwitchTests,
  requestSwitch,
  SECONDARY_IMAGE_ACCOUNT,
} from './provider-switch.test-support'

const fixtureForTest = setupSwitchTests()
afterEach(() => vi.restoreAllMocks())

it('uses the new account when publication wins the race with a push refresh mark', async () => {
  const fixture = await fixtureForTest()
  const { images, org } = fixture
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const id = (await record.read())?.buildId ?? ''
  await images.env.DB.prepare(
    "UPDATE org_images SET last_push_refresh_at = ? WHERE org_id = ? AND provider_account = 'boat'",
  )
    .bind(TEST_TIME, org.id)
    .run()
  const mark = refreshData.markSwitchPushRefresh
  vi.spyOn(refreshData, 'markSwitchPushRefresh').mockImplementationOnce(
    async (...args) => {
      await finishImageBuild(fixture, id)
      return mark(...args)
    },
  )
  const refreshed = await refreshImagesForPush(images, {
    githubRepositoryId: 1,
    ref: 'refs/heads/main',
    software: SOFTWARE,
  })
  expect(refreshed).toHaveLength(1)
  expect(await readBuildJob(images.env.DB, org.id, refreshed[0])).toMatchObject(
    { kind: 'refresh', providerAccount: SECONDARY_IMAGE_ACCOUNT },
  )
})

it('carries a push during a switch to the new image even while the old account is within its refresh window', async () => {
  const fixture = await fixtureForTest()
  const { images, org } = fixture
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const id = (await record.read())?.buildId ?? ''
  await images.env.DB.prepare(
    "UPDATE org_images SET last_push_refresh_at = ? WHERE org_id = ? AND provider_account = 'boat'",
  )
    .bind(TEST_TIME, org.id)
    .run()
  expect(
    await refreshImagesForPush(images, {
      githubRepositoryId: 1,
      ref: 'refs/heads/main',
      software: SOFTWARE,
    }),
  ).toEqual([])
  expect(
    (await readOrgImage(images.env.DB, org.id, SECONDARY_IMAGE_ACCOUNT))
      ?.pendingPushRefreshAt,
  ).toBe(TEST_TIME)
  await finishImageBuild(fixture, id)
  await runImageAlarm(images, {
    orgId: org.id,
    providerAccount: 'boat',
    software: SOFTWARE,
    buildId: null,
    nextAt: TEST_TIME,
  })
  const jobId = fixture.scheduled.at(-1)?.buildId ?? ''
  const refresh = await readBuildJob(images.env.DB, org.id, jobId)
  expect(refresh).toMatchObject({
    kind: 'refresh',
    providerAccount: SECONDARY_IMAGE_ACCOUNT,
  })
  expect(
    (await readOrgImage(images.env.DB, org.id, SECONDARY_IMAGE_ACCOUNT))
      ?.pendingPushRefreshAt,
  ).toBeNull()
})

it('ignores failed builds on another account when a repository change needs an automatic build', async () => {
  const fixture = await fixtureForTest()
  const { images, org } = fixture
  await images.env.DB.prepare(
    `INSERT INTO github_installations
    (id, account_login, account_type, created_at) VALUES (91, 'example', 'Organization', ?)`,
  )
    .bind(TEST_TIME)
    .run()
  await images.env.DB.prepare(
    "UPDATE repositories SET full_name = 'example/renamed' WHERE org_id = ?",
  )
    .bind(org.id)
    .run()
  await images.env.DB.prepare(
    `INSERT INTO image_builds (id, org_id, provider_account, kind, state,
    settings_revision, runner_protocol_version, started_at) VALUES ('failed-other-account', ?, ?, 'build', 'failed', 1, 2, ?)`,
  )
    .bind(org.id, SECONDARY_IMAGE_ACCOUNT, TEST_TIME)
    .run()
  expect(await imageHoldsOldValues(images.env.DB, org.id, 'boat')).toBe(true)
})
