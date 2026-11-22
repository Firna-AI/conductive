import { expect, it } from 'vitest'

import { readOrgProviderAccount } from '../data/org-provider-account'
import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { assignBuildSnapshot, readBuildJob, updateBuildJob } from './build-data'
import { startImageBuild } from './image-builds'
import { runImageAlarm } from './image-timers'
import { progressProviderSwitch } from './provider-switch-builds'
import { wakeProviderSwitch } from './provider-switch-control'
import { scheduleIdleImage as legacyScheduleIdleImage } from './provider-switch-legacy-schedule.test-support'
import { writeLegacyBuildEnd } from './provider-switch-legacy.test-support'
import {
  requestSwitch,
  setupSwitchTests,
  SECONDARY_IMAGE_ACCOUNT,
} from './provider-switch.test-support'
import { repairLifecycleAlarms } from './repair'

const fixtureForTest = setupSwitchTests()

it.each(['building', 'job-waiting'] as const)(
  'Cron re-arms a %s switch after the old idle scheduler, without progressing it',
  async (state) => {
    const fixture = await fixtureForTest()
    const { images, runtime, org, user, scheduled } = fixture
    const db = images.env.DB
    const member =
      state === 'job-waiting'
        ? await startImageBuild(images, {
            orgId: org.id,
            userId: user.id,
            kind: 'build',
            software: SOFTWARE,
          })
        : null
    const record = await requestSwitch(fixture)
    await progressProviderSwitch(images, org.id)
    const id = member ?? (await record.read())?.buildId ?? ''
    if (member) {
      await writeLegacyBuildEnd(
        db,
        {
          state: 'failed',
          buildId: member,
          message: 'The install script failed.',
        },
        TEST_TIME + 1000,
      )
    } else {
      await assignBuildSnapshot(
        db,
        id,
        'cron-target-image',
        SECONDARY_IMAGE_ACCOUNT,
      )
      await writeLegacyBuildEnd(
        db,
        {
          state: 'succeeded',
          job: await readBuildJob(db, org.id, id),
        },
        TEST_TIME + 1000,
      )
    }
    await updateBuildJob(db, id, 'done')
    await db
      .prepare(
        "UPDATE org_images SET next_image_refresh_at = ? WHERE org_id = ? AND provider_account = 'boat'",
      )
      .bind(TEST_TIME + 86_400_000, org.id)
      .run()
    await fixture.setTime(TEST_TIME + 2000)
    await legacyScheduleIdleImage(images, org.id, SOFTWARE)
    expect(scheduled.at(-1)).toMatchObject({
      buildId: null,
      nextAt: TEST_TIME + 86_400_000,
    })
    scheduled.length = 0
    const before = await record.read()
    for (const now of [TEST_TIME + 2000, TEST_TIME + 3000]) {
      await fixture.setTime(now)
      expect(
        await repairLifecycleAlarms(runtime, images, () => SOFTWARE),
      ).toEqual({
        workspaces: 0,
        orgs: 1,
        pendingWorkspaces: 0,
        pendingOrgs: 0,
      })
      expect(scheduled.at(-1)).toEqual({
        orgId: org.id,
        software: SOFTWARE,
        buildId: null,
        nextAt: now,
      })
      expect(await record.read()).toEqual(before)
      expect(await readOrgProviderAccount(db, org.id)).toBe('boat')
    }
    await runImageAlarm(images, {
      orgId: org.id,
      software: SOFTWARE,
      buildId: null,
      nextAt: TEST_TIME + 3000,
    })
    expect(await record.read()).toMatchObject({
      state: state === 'building' ? 'completed' : 'building',
    })
  },
)

it('Cron schedules a failed wake without a good image and leaves progression to its coordinator', async () => {
  const fixture = await fixtureForTest()
  const { images, runtime, org, scheduled } = fixture
  const db = images.env.DB
  await db.prepare('DELETE FROM org_images WHERE org_id = ?').bind(org.id).run()
  const record = await requestSwitch(fixture)
  await db
    .prepare(
      `CREATE TRIGGER test_empty_switch_wake BEFORE UPDATE OF provider_account ON orgs
    BEGIN SELECT RAISE(FAIL, 'wake failed'); END`,
    )
    .run()
  try {
    await wakeProviderSwitch(images, org.id)
  } finally {
    await db.prepare('DROP TRIGGER test_empty_switch_wake').run()
  }
  expect(await record.read()).toMatchObject({ state: 'waiting', buildId: null })
  expect(scheduled).toEqual([])
  expect(await repairLifecycleAlarms(runtime, images, () => SOFTWARE)).toEqual({
    workspaces: 0,
    orgs: 1,
    pendingWorkspaces: 0,
    pendingOrgs: 0,
  })
  expect(scheduled).toEqual([
    {
      orgId: org.id,
      software: SOFTWARE,
      buildId: null,
      nextAt: TEST_TIME,
    },
  ])
  expect(await record.read()).toMatchObject({ state: 'waiting' })
  expect(await readOrgProviderAccount(db, org.id)).toBe('boat')
  await runImageAlarm(images, {
    orgId: org.id,
    software: SOFTWARE,
    buildId: null,
    nextAt: TEST_TIME,
  })
  expect(await record.read()).toMatchObject({ state: 'completed' })
  expect(await readOrgProviderAccount(db, org.id)).toBe(SECONDARY_IMAGE_ACCOUNT)
})
