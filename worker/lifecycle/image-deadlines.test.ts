import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuild, runningBuild } from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { runImageAlarm } from './image-timers'
import { readImageSettings } from './settings-data'

const backendFixture = setupBackendTests()

it('preserves the saved daily refresh deadline after a build fails at hour 23', async () => {
  const fixture = await backendFixture()
  const { images, org, user, runtime } = fixture
  const good = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await finishImageBuild(fixture, good)
  const image = (await readImageSettings(runtime.env.DB, org.id)).imageName
  fixture.setTime(TEST_TIME + 82_800_000)
  images.prepareSources = async () => {
    throw new Error('Source transfer failed')
  }
  const failed = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await finishImageBuild(fixture, failed)

  expect((await readBuild(runtime.env.DB, org.id, failed)).build.state).toBe(
    'failed',
  )
  expect(await readImageSettings(runtime.env.DB, org.id)).toMatchObject({
    imageName: image,
    nextImageRefreshAt: TEST_TIME + 86_400_000,
  })
  expect(fixture.scheduled.at(-1)).toMatchObject({
    buildId: null,
    nextAt: TEST_TIME + 86_400_000,
  })
})

it('advances an admitted daily refresh before failure and waits until the next day when a push is also due', async () => {
  const fixture = await backendFixture()
  const { images, org, user, runtime } = fixture
  const good = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await finishImageBuild(fixture, good)
  fixture.setTime(TEST_TIME + 86_400_000)
  await runtime.env.DB.prepare(
    'UPDATE settings SET pending_push_refresh_at = ?, last_push_refresh_at = ? WHERE org_id = ?',
  )
    .bind(TEST_TIME + 86_400_000, TEST_TIME + 84_600_000, org.id)
    .run()
  const daily = fixture.scheduled.at(-1)
  if (!daily) throw new Error('Missing daily schedule')
  await runImageAlarm(images, daily)
  const refresh = fixture.scheduled.at(-1)?.buildId
  if (!refresh) throw new Error('Missing admitted daily refresh')
  expect(await readImageSettings(runtime.env.DB, org.id)).toMatchObject({
    nextImageRefreshAt: TEST_TIME + 172_800_000,
    pendingPushRefreshAt: null,
    lastPushRefreshAt: TEST_TIME + 86_400_000,
  })
  images.prepareSources = async () => {
    throw new Error('Source transfer failed')
  }
  await finishImageBuild(fixture, refresh)
  expect((await readBuild(runtime.env.DB, org.id, refresh)).build.state).toBe(
    'failed',
  )
  expect(await readImageSettings(runtime.env.DB, org.id)).toMatchObject({
    imageBuildId: good,
    nextImageRefreshAt: TEST_TIME + 172_800_000,
  })
  expect(fixture.scheduled.at(-1)).toMatchObject({
    buildId: null,
    nextAt: TEST_TIME + 172_800_000,
  })
  await runImageAlarm(images, daily)
  expect(await runningBuild(runtime.env.DB, org.id)).toBeNull()
  expect(fixture.scheduled.at(-1)).toMatchObject({
    buildId: null,
    nextAt: TEST_TIME + 172_800_000,
  })
})
