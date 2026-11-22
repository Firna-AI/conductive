import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { readOperatorOverview } from '../operator/overview'
import { readOperatorOrg } from '../operator/org-detail'
import { SOFTWARE } from './backend-test-support'
import {
  assignBuildSnapshot,
  failBuild,
  readBuild,
  readBuildJob,
  runningBuild,
} from './build-data'
import { publishBuild } from './build-admission-data'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { IMAGE_BUILD_TIME_LIMIT_MS } from './job-time-limit'
import { progressProviderSwitch } from './provider-switch-builds'
import { promoteWaitingImageBuild } from './waiting-image-data'
import {
  setupSwitchTests,
  requestSwitch,
  SECONDARY_IMAGE_ACCOUNT,
} from './provider-switch.test-support'

const fixtureForTest = setupSwitchTests()

it('rolls back the account and image pin if a waiting build cannot enter execution', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const hidden = (await record.read())?.buildId ?? ''
  const queued = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await assignBuildSnapshot(db, hidden, 'new-image', SECONDARY_IMAGE_ACCOUNT)
  await publishBuild(db, await readBuildJob(db, org.id, hidden), TEST_TIME + 1)
  await db
    .prepare(
      `CREATE TRIGGER test_wait_execution_failure BEFORE UPDATE OF waiting_for_switch_id ON image_builds
    WHEN OLD.waiting_for_switch_id IS NOT NULL AND NEW.waiting_for_switch_id IS NULL
    BEGIN SELECT RAISE(FAIL, 'execution write refused'); END`,
    )
    .run()
  try {
    await expect(
      promoteWaitingImageBuild(db, org.id, TEST_TIME + 2),
    ).rejects.toThrow('execution write refused')
    expect(await readBuildJob(db, org.id, queued)).toMatchObject({
      waitingForSwitchId: record.id,
      executionStartedAt: null,
      providerAccount: 'boat',
      previousProviderAccount: 'boat',
      previousImageName: 'last-good-image',
    })
  } finally {
    await db.prepare('DROP TRIGGER test_wait_execution_failure').run()
  }
  expect(await promoteWaitingImageBuild(db, org.id, TEST_TIME + 2)).toBe(queued)
  expect(await readBuildJob(db, org.id, queued)).toMatchObject({
    waitingForSwitchId: null,
    executionStartedAt: TEST_TIME + 2,
    providerAccount: SECONDARY_IMAGE_ACCOUNT,
    previousProviderAccount: SECONDARY_IMAGE_ACCOUNT,
    previousImageName: 'new-image',
  })
})

it('records one visible waiting build and runs its saved inputs on the new account after the hidden build', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user } = fixture
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const hidden = (await record.read())?.buildId
  expect(hidden).toEqual(expect.any(String))
  await images.env.DB.prepare(
    "UPDATE settings SET install_script = 'echo member', revision = 4 WHERE org_id = ?",
  )
    .bind(org.id)
    .run()
  const input = {
    orgId: org.id,
    userId: user.id,
    kind: 'build' as const,
    software: SOFTWARE,
  }
  const [first, repeated] = await Promise.all([
    startImageBuild(images, input),
    startImageBuild(images, input),
  ])
  expect(first).not.toBe(hidden)
  expect(repeated).toBe(first)
  expect(await readBuildJob(images.env.DB, org.id, first)).toMatchObject({
    state: 'running',
    kind: 'build',
    waitingForSwitchId: record.id,
    providerAccount: 'boat',
    executionStartedAt: null,
    sandboxId: null,
  })
  expect((await readBuild(images.env.DB, org.id, first)).log).toEqual([
    {
      eventNumber: 1,
      occurredAt: TEST_TIME,
      text: 'Waiting for another update of the cloud computer to finish\n',
    },
  ])
  expect(await runningBuild(images.env.DB, org.id)).toBe(hidden)
  expect(
    (await readOperatorOverview(images.env.DB, TEST_TIME)).running.builds,
  ).toBe(1)
  expect(
    (await readOperatorOrg(images.env.DB, org.id, TEST_TIME)).running.builds,
  ).toBe(1)
  await finishImageBuild(fixture, hidden ?? '')
  expect(await runningBuild(images.env.DB, org.id)).toBe(first)
  expect(await readBuildJob(images.env.DB, org.id, first)).toMatchObject({
    waitingForSwitchId: null,
    providerAccount: SECONDARY_IMAGE_ACCOUNT,
    executionStartedAt: TEST_TIME,
  })
  expect(
    await images.env.DB.prepare(
      'SELECT install_script FROM image_build_jobs WHERE build_id = ?',
    )
      .bind(first)
      .first('install_script'),
  ).toBe('echo member')
  await finishImageBuild(fixture, first)
  expect((await readBuild(images.env.DB, org.id, first)).build.state).toBe(
    'succeeded',
  )
})

it('keeps a waiting build outside its time limit and admits execution once after a failed switch', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user, boat } = fixture
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const hidden = (await record.read())?.buildId
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  expect(id).not.toBe(hidden)
  await fixture.setTime(TEST_TIME + IMAGE_BUILD_TIME_LIMIT_MS + 1)
  expect(await advanceImageBuild(images, org.id, id)).toBe(false)
  expect((await readBuild(images.env.DB, org.id, id)).build.state).toBe(
    'running',
  )
  expect(boat.starts).toEqual([])
  expect(
    await promoteWaitingImageBuild(
      images.env.DB,
      org.id,
      images.dependencies.now(),
    ),
  ).toBeNull()
  await failBuild(
    images.env.DB,
    hidden ?? '',
    'The build failed.',
    images.dependencies.now(),
  )
  const admitted = await Promise.all([
    promoteWaitingImageBuild(images.env.DB, org.id, images.dependencies.now()),
    promoteWaitingImageBuild(images.env.DB, org.id, images.dependencies.now()),
  ])
  expect(admitted.filter((value) => value === id)).toHaveLength(1)
  expect(admitted.filter((value) => value === null)).toHaveLength(1)
  expect(await readBuildJob(images.env.DB, org.id, id)).toMatchObject({
    providerAccount: 'boat',
    executionStartedAt: TEST_TIME + IMAGE_BUILD_TIME_LIMIT_MS + 1,
    previousImageName: 'last-good-image',
  })
  await advanceImageBuild(images, org.id, id)
  expect((await readBuild(images.env.DB, org.id, id)).build.state).toBe(
    'running',
  )
  await fixture.setTime(TEST_TIME + 2 * IMAGE_BUILD_TIME_LIMIT_MS + 1)
  await advanceImageBuild(images, org.id, id)
  expect((await readBuild(images.env.DB, org.id, id)).build.error).toContain(
    '60-minute limit',
  )
})
