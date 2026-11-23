import { afterEach, expect, it, vi } from 'vitest'

import { readOrgProviderAccount } from '../data/org-provider-account'
import { recordProviderSwitchStop } from '../operator/switch-write-data'
import { TEST_TIME } from '../test-support/harness'
import { assignBuildSnapshot, readBuildJob, runningBuild } from './build-data'
import { advanceImageBuild } from './image-builds'
import { JobTimeLimit } from './job-time-limit'
import { readOrgImage } from './org-image-data'
import { progressProviderSwitch } from './provider-switch-builds'
import * as switchData from './provider-switch-data'
import { writeLegacyBuildEnd } from './provider-switch-legacy.test-support'
import {
  requestSwitch,
  setupSwitchTests,
  SECONDARY_IMAGE_ACCOUNT,
} from './provider-switch.test-support'

const fixtureForTest = setupSwitchTests()
afterEach(() => vi.restoreAllMocks())

it('completes an old writer publication, suppresses its added build, and leaves the switch poll', async () => {
  const fixture = await fixtureForTest()
  const { images, org } = fixture
  const db = images.env.DB
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const id = (await record.read())?.buildId ?? ''
  await db
    .prepare('UPDATE settings SET revision = 2 WHERE org_id = ?')
    .bind(org.id)
    .run()
  await db
    .prepare(
      `UPDATE org_images SET pending_push_refresh_at = ?, next_image_refresh_at = ?
    WHERE org_id = ? AND provider_account = 'boat'`,
    )
    .bind(TEST_TIME + 20, TEST_TIME + 40_000, org.id)
    .run()
  await db
    .prepare(
      `UPDATE org_images SET pending_push_refresh_at = ?
    WHERE org_id = ? AND provider_account = ?`,
    )
    .bind(TEST_TIME + 30_000, org.id, SECONDARY_IMAGE_ACCOUNT)
    .run()
  await assignBuildSnapshot(
    db,
    id,
    'legacy-target-image',
    SECONDARY_IMAGE_ACCOUNT,
  )
  await writeLegacyBuildEnd(
    db,
    { state: 'succeeded', job: await readBuildJob(db, org.id, id) },
    TEST_TIME + 1000,
  )
  expect(await record.read()).toMatchObject({
    state: 'building',
    accountChangedAt: null,
  })
  expect(await readBuildJob(db, org.id, id)).toMatchObject({
    state: 'succeeded',
    phase: 'cleanup-build',
  })
  expect(await runningBuild(db, org.id)).toBeNull()
  await fixture.setTime(TEST_TIME + 2000)
  expect.soft(await progressProviderSwitch(images, org.id)).toBe(false)
  expect(await record.read()).toMatchObject({
    state: 'completed',
    accountChangedAt: TEST_TIME + 2000,
    buildCompletedAt: TEST_TIME + 1000,
    failure: null,
    waitReason: null,
  })
  expect(await readOrgProviderAccount(db, org.id)).toBe(SECONDARY_IMAGE_ACCOUNT)
  expect(await readOrgImage(db, org.id, 'boat')).toMatchObject({
    imageName: 'last-good-image',
    nextImageRefreshAt: null,
    pendingPushRefreshAt: null,
  })
  expect(await readOrgImage(db, org.id, SECONDARY_IMAGE_ACCOUNT)).toMatchObject(
    {
      imageBuildId: id,
      imageName: 'legacy-target-image',
      pendingPushRefreshAt: TEST_TIME + 30_000,
    },
  )
  expect((await readBuildJob(db, org.id, id)).phase).toBe('cleanup')
  await advanceImageBuild(images, org.id, id)
  expect(fixture.scheduled.at(-1)).toMatchObject({
    buildId: null,
    nextAt: TEST_TIME + 30_000,
  })
  expect(await runningBuild(db, org.id)).toBeNull()
  const completed = await record.read()
  expect.soft(await progressProviderSwitch(images, org.id)).toBe(false)
  expect(await record.read()).toEqual(completed)
})

it.each([
  {
    scenario: 'failed script',
    state: 'failed',
    message: 'The install script failed.',
    failure: 'script',
  },
  {
    scenario: 'expired build',
    state: 'failed',
    message: new JobTimeLimit('build').message,
    failure: 'time-limit',
  },
  {
    scenario: 'unpublished success',
    state: 'succeeded',
    message: '',
    failure: 'script',
  },
] as const)(
  'fails a switch after the old writer leaves $scenario',
  async ({ state, message, failure }) => {
    const fixture = await fixtureForTest()
    const { images, org } = fixture
    const db = images.env.DB
    const record = await requestSwitch(fixture)
    await progressProviderSwitch(images, org.id)
    const id = (await record.read())?.buildId ?? ''
    await assignBuildSnapshot(
      db,
      id,
      'unpublished-target',
      SECONDARY_IMAGE_ACCOUNT,
    )
    await writeLegacyBuildEnd(
      db,
      state === 'failed'
        ? { state, buildId: id, message }
        : { state, job: await readBuildJob(db, org.id, id) },
      TEST_TIME + 1000,
    )
    await db
      .prepare(
        `UPDATE org_images SET image_build_id = 'secondary-image-build', image_name = 'secondary-image'
    WHERE org_id = ? AND provider_account = ?`,
      )
      .bind(org.id, SECONDARY_IMAGE_ACCOUNT)
      .run()
    await db
      .prepare("UPDATE image_build_jobs SET phase = 'done' WHERE build_id = ?")
      .bind(id)
      .run()
    await fixture.setTime(TEST_TIME + 2000)
    expect.soft(await progressProviderSwitch(images, org.id)).toBe(false)
    expect(await record.read()).toMatchObject({
      state: 'failed',
      failure,
      buildCompletedAt: TEST_TIME + 1000,
      accountChangedAt: null,
    })
    expect(await readOrgProviderAccount(db, org.id)).toBe('boat')
    expect(await readOrgImage(db, org.id, 'boat')).toMatchObject({
      imageName: 'last-good-image',
    })
    expect(await runningBuild(db, org.id)).toBeNull()
  },
)

it('keeps Stop when it wins after progression reads an old writer publication', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const id = (await record.read())?.buildId ?? ''
  await assignBuildSnapshot(
    db,
    id,
    'stopped-legacy-image',
    SECONDARY_IMAGE_ACCOUNT,
  )
  await writeLegacyBuildEnd(
    db,
    { state: 'succeeded', job: await readBuildJob(db, org.id, id) },
    TEST_TIME + 1000,
  )
  const readOpen = switchData.readOpenProviderSwitch
  vi.spyOn(switchData, 'readOpenProviderSwitch').mockImplementationOnce(
    async (...args) => {
      const stale = await readOpen(...args)
      await recordProviderSwitchStop(db, org.id, user.id, TEST_TIME + 1500)
      return stale
    },
  )
  await fixture.setTime(TEST_TIME + 2000)
  expect.soft(await progressProviderSwitch(images, org.id)).toBe(false)
  expect(await record.read()).toMatchObject({
    state: 'stopped',
    stoppedAt: TEST_TIME + 1500,
    accountChangedAt: null,
    failure: null,
  })
  expect(await readOrgProviderAccount(db, org.id)).toBe('boat')
})
