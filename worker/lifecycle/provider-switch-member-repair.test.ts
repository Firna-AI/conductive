import { expect, it } from 'vitest'

import { readOrgProviderAccount } from '../data/org-provider-account'
import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { assignBuildSnapshot, readBuildJob } from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { runImageAlarm } from './image-timers'
import { readOrgImage } from './org-image-data'
import { progressProviderSwitch } from './provider-switch-builds'
import { writeLegacyBuildEnd } from './provider-switch-legacy.test-support'
import {
  requestSwitch,
  setupSwitchTests,
  SECONDARY_IMAGE_ACCOUNT,
} from './provider-switch.test-support'
import { promoteWaitingImageBuild } from './waiting-image-data'

const fixtureForTest = setupSwitchTests()

it('runs a queued member build on the repaired account and makes its result current', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  images.env.PROVIDER_SWITCH = 'off'
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const hidden = (await record.read())?.buildId ?? ''
  await db
    .prepare(
      "UPDATE settings SET install_script = 'echo member-change', revision = 2 WHERE org_id = ?",
    )
    .bind(org.id)
    .run()
  const queued = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await assignBuildSnapshot(
    db,
    hidden,
    'legacy-new-image',
    SECONDARY_IMAGE_ACCOUNT,
  )
  await writeLegacyBuildEnd(
    db,
    {
      state: 'succeeded',
      job: await readBuildJob(db, org.id, hidden),
    },
    TEST_TIME + 1000,
  )
  await fixture.setTime(TEST_TIME + 2000)
  await runImageAlarm(images, {
    orgId: org.id,
    software: SOFTWARE,
    buildId: hidden,
    nextAt: TEST_TIME + 2000,
  })
  expect(await record.read()).toMatchObject({ state: 'completed' })
  expect(await readOrgProviderAccount(db, org.id)).toBe(SECONDARY_IMAGE_ACCOUNT)
  expect(await readBuildJob(db, org.id, queued)).toMatchObject({
    providerAccount: SECONDARY_IMAGE_ACCOUNT,
    waitingForSwitchId: null,
    executionStartedAt: TEST_TIME + 2000,
  })
  await finishImageBuild(fixture, queued)
  expect((await readBuildJob(db, org.id, queued)).state).toBe('succeeded')
  expect(await readOrgImage(db, org.id, SECONDARY_IMAGE_ACCOUNT)).toMatchObject(
    { imageBuildId: queued },
  )
})

it('resolves an ended switch inside member admission before pinning its account', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const hidden = (await record.read())?.buildId ?? ''
  await assignBuildSnapshot(
    db,
    hidden,
    'admission-image',
    SECONDARY_IMAGE_ACCOUNT,
  )
  await writeLegacyBuildEnd(
    db,
    {
      state: 'succeeded',
      job: await readBuildJob(db, org.id, hidden),
    },
    TEST_TIME + 1000,
  )
  await fixture.setTime(TEST_TIME + 2000)
  const member = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  expect(await record.read()).toMatchObject({ state: 'completed' })
  expect(await readBuildJob(db, org.id, member)).toMatchObject({
    providerAccount: SECONDARY_IMAGE_ACCOUNT,
    previousImageName: 'admission-image',
    waitingForSwitchId: null,
  })
})

it.each(['promotion', 'admission'] as const)(
  'keeps the member wait when an unresolved building switch appears before the %s batch',
  async (operation) => {
    const fixture = await fixtureForTest()
    const { images, org, user } = fixture
    const db = images.env.DB
    const record = await requestSwitch(fixture)
    await progressProviderSwitch(images, org.id)
    const hidden = (await record.read())?.buildId ?? ''
    const input = {
      orgId: org.id,
      userId: user.id,
      kind: 'build' as const,
      software: SOFTWARE,
    }
    const queued =
      operation === 'promotion' ? await startImageBuild(images, input) : null
    // A missing retained result cannot resolve the switch account yet.
    await db
      .prepare('UPDATE image_builds SET operator_switch_id = NULL WHERE id = ?')
      .bind(hidden)
      .run()
    await db
      .prepare(
        "UPDATE image_builds SET state = 'failed', completed_at = ? WHERE id = ?",
      )
      .bind(TEST_TIME + 1000, hidden)
      .run()
    await db
      .prepare(
        "UPDATE org_provider_switches SET state = 'waiting' WHERE id = ?",
      )
      .bind(record.id)
      .run()
    const batch = db.batch.bind(db)
    let raced = false
    const raceBatch = async <T>(statements: D1PreparedStatement[]) => {
      if (!raced && statements.length > 1) {
        raced = true
        await db
          .prepare(
            "UPDATE org_provider_switches SET state = 'building' WHERE id = ?",
          )
          .bind(record.id)
          .run()
      }
      return batch<T>(statements)
    }
    const racingDb = new Proxy(db, {
      get(target, key) {
        return key === 'batch' ? raceBatch : Reflect.get(target, key)
      },
    })
    const racingImages = { ...images, env: { ...images.env, DB: racingDb } }
    const id = queued ?? (await startImageBuild(racingImages, input))
    expect(
      await promoteWaitingImageBuild(racingDb, org.id, TEST_TIME + 2000),
    ).toBeNull()
    expect(raced).toBe(true)
    expect(await record.read()).toMatchObject({ state: 'building' })
    expect(await readBuildJob(db, org.id, id)).toMatchObject({
      waitingForSwitchId: record.id,
      executionStartedAt: null,
      providerAccount: 'boat',
    })
  },
)
