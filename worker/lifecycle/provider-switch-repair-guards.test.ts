import { expect, it } from 'vitest'

import { readOrgProviderAccount } from '../data/org-provider-account'
import { TEST_TIME } from '../test-support/harness'
import { assignBuildSnapshot, readBuildJob } from './build-data'
import { progressProviderSwitch } from './provider-switch-builds'
import { writeLegacyBuildEnd } from './provider-switch-legacy.test-support'
import {
  requestSwitch,
  setupSwitchTests,
  SECONDARY_IMAGE_ACCOUNT,
} from './provider-switch.test-support'

const fixtureForTest = setupSwitchTests()

async function publishedFixture() {
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
  return { ...fixture, record, id, db }
}

it.each([
  {
    scenario: 'org suspension',
    sql: 'UPDATE orgs SET suspended_at = ? WHERE id = ?',
    value: TEST_TIME + 1500,
    target: 'org',
    account: 'boat',
    state: 'waiting',
    waitReason: 'suspended',
    failure: null,
  },
  {
    scenario: 'org deletion',
    sql: 'UPDATE orgs SET deleted_at = ? WHERE id = ?',
    value: TEST_TIME + 1500,
    target: 'org',
    account: 'boat',
    state: 'waiting',
    waitReason: 'deleted',
    failure: null,
  },
  {
    scenario: 'another account change',
    sql: 'UPDATE orgs SET provider_account = ? WHERE id = ?',
    value: SECONDARY_IMAGE_ACCOUNT,
    target: 'org',
    account: SECONDARY_IMAGE_ACCOUNT,
    state: 'failed',
    waitReason: null,
    failure: 'script',
  },
  {
    scenario: 'starter suspension',
    sql: 'UPDATE users SET suspended_at = ? WHERE id = ?',
    value: TEST_TIME + 1500,
    target: 'user',
    account: 'boat',
    state: 'waiting',
    waitReason: 'admin',
    failure: null,
  },
] as const)(
  'ends the unresolved publication with $state after $scenario wins',
  async ({ sql, value, target, account, state, waitReason, failure }) => {
    const { images, org, user, db, record } = await publishedFixture()
    await db
      .prepare(sql)
      .bind(value, target === 'org' ? org.id : user.id)
      .run()
    expect(await progressProviderSwitch(images, org.id)).toBe(
      state === 'waiting',
    )
    expect(await record.read()).toMatchObject({
      state,
      waitReason,
      buildCompletedAt: TEST_TIME + 1000,
      accountChangedAt: null,
      failure,
    })
    expect(await readOrgProviderAccount(db, org.id)).toBe(account)
  },
)

it('rolls back the added-build suppression and switch completion if the repair account write fails', async () => {
  const { images, org, id, db, record } = await publishedFixture()
  await db
    .prepare(
      `CREATE TRIGGER test_repair_publish_failure BEFORE UPDATE OF provider_account ON orgs
    WHEN NEW.provider_account != OLD.provider_account
    BEGIN SELECT RAISE(FAIL, 'repair account write refused'); END`,
    )
    .run()
  try {
    await expect(progressProviderSwitch(images, org.id)).rejects.toThrow(
      'repair account write refused',
    )
    expect(await record.read()).toMatchObject({
      state: 'building',
      accountChangedAt: null,
      buildCompletedAt: null,
    })
    expect(await readOrgProviderAccount(db, org.id)).toBe('boat')
    expect((await readBuildJob(db, org.id, id)).phase).toBe('cleanup-build')
  } finally {
    await db.prepare('DROP TRIGGER test_repair_publish_failure').run()
  }
  expect(await progressProviderSwitch(images, org.id)).toBe(false)
  expect(await record.read()).toMatchObject({ state: 'completed' })
})
