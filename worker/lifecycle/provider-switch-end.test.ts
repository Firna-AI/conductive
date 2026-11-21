import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { readOrgProviderAccount } from '../data/org-provider-account'
import { recordProviderSwitchStop } from '../operator/switch-write-data'
import { SOFTWARE } from './backend-test-support'
import {
  assignBuildSnapshot,
  readBuildJob,
  runningBuild,
  failBuild,
} from './build-data'
import { publishBuild } from './build-admission-data'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { progressProviderSwitch } from './provider-switch-builds'
import { IMAGE_BUILD_TIME_LIMIT_MS } from './job-time-limit'
import {
  setupSwitchTests,
  requestSwitch,
  SECONDARY_IMAGE_ACCOUNT,
} from './provider-switch.test-support'

const fixtureForTest = setupSwitchTests()

it('rolls back the image, completion, and switch state when the account publication write fails', async () => {
  const fixture = await fixtureForTest()
  const { images, org } = fixture
  const db = images.env.DB
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const id = (await record.read())?.buildId ?? ''
  await assignBuildSnapshot(db, id, 'new-target-image', SECONDARY_IMAGE_ACCOUNT)
  await db
    .prepare(
      `CREATE TRIGGER test_switch_publish_failure BEFORE UPDATE OF provider_account ON orgs
    WHEN NEW.provider_account != OLD.provider_account BEGIN SELECT RAISE(FAIL, 'switch account write refused'); END`,
    )
    .run()
  try {
    await expect(
      publishBuild(db, await readBuildJob(db, org.id, id), TEST_TIME + 1),
    ).rejects.toThrow('switch account write refused')
    expect(await readOrgProviderAccount(db, org.id)).toBe('boat')
    expect(
      await db
        .prepare(
          'SELECT image_name FROM org_images WHERE org_id = ? AND provider_account = ?',
        )
        .bind(org.id, SECONDARY_IMAGE_ACCOUNT)
        .first('image_name'),
    ).toBe('secondary-image')
    expect(await record.read()).toMatchObject({
      state: 'building',
      accountChangedAt: null,
    })
    expect((await readBuildJob(db, org.id, id)).state).toBe('running')
  } finally {
    await db.prepare('DROP TRIGGER test_switch_publish_failure').run()
  }
})

it.each([
  {
    action: 'stopped',
    state: 'stopped',
    stoppedAt: TEST_TIME + 1,
    waitReason: null,
  },
  {
    action: 'deleted',
    state: 'waiting',
    stoppedAt: null,
    waitReason: 'deleted',
  },
] as const)(
  'prevents a $action switch from publishing a late snapshot and ends its build',
  async ({ action, state, stoppedAt, waitReason }) => {
    const fixture = await fixtureForTest()
    const { images, org, user } = fixture
    const db = images.env.DB
    const record = await requestSwitch(fixture)
    await progressProviderSwitch(images, org.id)
    const id = (await record.read())?.buildId ?? ''
    await assignBuildSnapshot(db, id, 'late-image', SECONDARY_IMAGE_ACCOUNT)
    const job = await readBuildJob(db, org.id, id)
    if (action === 'stopped')
      await recordProviderSwitchStop(db, org.id, user.id, TEST_TIME + 1)
    else
      await db
        .prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
        .bind(TEST_TIME + 1, org.id)
        .run()
    await publishBuild(db, job, TEST_TIME + 2)
    expect(await readOrgProviderAccount(db, org.id)).toBe('boat')
    expect(
      await db
        .prepare(
          'SELECT image_name FROM org_images WHERE org_id = ? AND provider_account = ?',
        )
        .bind(org.id, SECONDARY_IMAGE_ACCOUNT)
        .first('image_name'),
    ).toBe('secondary-image')
    await advanceImageBuild(images, org.id, id)
    expect((await readBuildJob(db, org.id, id)).state).toBe('failed')
    expect(await record.read()).toMatchObject({
      state,
      stoppedAt,
      waitReason,
      accountChangedAt: null,
    })
    expect(await runningBuild(db, org.id)).toBeNull()
  },
)

it('waits for a member job without ending it and starts the switch from the job result', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user } = fixture
  const id = await startImageBuild(images, {
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
    waitingJob: {
      id,
      kind: 'build',
      startedAt: TEST_TIME,
      starter: { githubId: 7, login: 'octocat' },
    },
  })
  expect((await readBuildJob(images.env.DB, org.id, id)).state).toBe('running')
  await finishImageBuild(fixture, id)
  expect(await record.read()).toMatchObject({ state: 'building' })
})

it('records each switch failure cause and leaves the current account unchanged', async () => {
  const fixture = await fixtureForTest()
  const { images, org } = fixture
  for (const cause of ['provider', 'script', 'time-limit'] as const) {
    const record = await requestSwitch(fixture)
    await progressProviderSwitch(images, org.id)
    const id = (await record.read())?.buildId ?? ''
    if (cause === 'time-limit') {
      await fixture.setTime(
        images.dependencies.now() + IMAGE_BUILD_TIME_LIMIT_MS,
      )
      await advanceImageBuild(images, org.id, id)
    } else if (cause === 'provider') {
      await images.env.DB.prepare(
        `UPDATE image_builds SET provider_retry_json = ? WHERE id = ?`,
      )
        .bind(
          JSON.stringify({
            openedAt: images.dependencies.now() - 600_000,
            failures: 10,
            retryAt: images.dependencies.now(),
          }),
          id,
        )
        .run()
      await advanceImageBuild(images, org.id, id)
    } else {
      await failBuild(
        images.env.DB,
        id,
        'The install script failed.',
        images.dependencies.now(),
      )
    }
    expect(await record.read()).toMatchObject({
      state: 'failed',
      failure: cause,
      accountChangedAt: null,
    })
    expect(await readOrgProviderAccount(images.env.DB, org.id)).toBe('boat')
    expect(
      await images.env.DB.prepare(
        "SELECT image_name FROM org_images WHERE org_id = ? AND provider_account = 'boat'",
      )
        .bind(org.id)
        .first('image_name'),
    ).toBe('last-good-image')
  }
})
