import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { readBuildJob, failBuild } from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { progressProviderSwitch } from './provider-switch-builds'
import { runImageAlarm } from './image-timers'
import { readOrgProviderAccount } from '../data/org-provider-account'
import {
  setupSwitchTests,
  requestSwitch,
  SECONDARY_IMAGE_ACCOUNT,
} from './provider-switch.test-support'

const fixtureForTest = setupSwitchTests()

it('copies the last installed script and revision when the published image is a refresh of unsaved settings', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user } = fixture
  await images.env.DB.prepare(
    "UPDATE image_build_jobs SET install_script = 'echo installed' WHERE build_id = 'published-image'",
  ).run()
  await images.env.DB.prepare(
    "UPDATE settings SET install_script = 'exit 99', revision = 9 WHERE org_id = ?",
  )
    .bind(org.id)
    .run()
  const refresh = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'refresh',
    software: SOFTWARE,
  })
  await finishImageBuild(fixture, refresh)
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const id = (await record.read())?.buildId ?? ''
  expect((await readBuildJob(images.env.DB, org.id, id)).settingsRevision).toBe(
    1,
  )
  expect(
    await images.env.DB.prepare(
      'SELECT install_script FROM image_build_jobs WHERE build_id = ?',
    )
      .bind(id)
      .first('install_script'),
  ).toBe('echo installed')
})

it('waits for a first build and changes the account without a switch build if that first build fails', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user } = fixture
  await images.env.DB.prepare(
    "DELETE FROM org_images WHERE org_id = ? AND provider_account = 'boat'",
  )
    .bind(org.id)
    .run()
  const first = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  expect(await record.read()).toMatchObject({
    state: 'waiting',
    waitReason: 'job',
  })
  expect(await readOrgProviderAccount(images.env.DB, org.id)).toBe('boat')
  await failBuild(images.env.DB, first, 'The first build failed.', TEST_TIME)
  await finishImageBuild(fixture, first)
  expect(await record.read()).toMatchObject({
    state: 'completed',
    buildId: null,
  })
  expect(await readOrgProviderAccount(images.env.DB, org.id)).toBe(
    SECONDARY_IMAGE_ACCOUNT,
  )
  expect(fixture.boat.starts).toEqual([])
})

it('keeps an image timer for a waiting switch and starts when an active admin becomes available', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user } = fixture
  await images.env.DB.prepare(
    "UPDATE org_members SET role = 'member' WHERE org_id = ?",
  )
    .bind(org.id)
    .run()
  const record = await requestSwitch(fixture)
  const state = {
    orgId: org.id,
    software: SOFTWARE,
    buildId: null,
    nextAt: TEST_TIME,
  }
  await runImageAlarm(images, state)
  expect(await record.read()).toMatchObject({
    state: 'waiting',
    waitReason: 'admin',
  })
  expect(fixture.scheduled.at(-1)).toMatchObject({
    orgId: org.id,
    buildId: null,
    nextAt: TEST_TIME + 1000,
  })
  await images.env.DB.prepare(
    "UPDATE org_members SET role = 'admin' WHERE org_id = ? AND user_id = ?",
  )
    .bind(org.id, user.id)
    .run()
  await fixture.setTime(TEST_TIME + 1000)
  await runImageAlarm(images, { ...state, nextAt: TEST_TIME + 1000 })
  expect(await record.read()).toMatchObject({ state: 'building' })
})
