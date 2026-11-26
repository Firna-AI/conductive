import { expect, it } from 'vitest'

import {
  operatorOrgSwitchPath,
  type OperatorOrgSwitchResponse,
} from '../../src/shared/operator-switch'
import { TEST_TIME } from '../test-support/harness'
import { orgPage } from './directory.test-support'
import { seedBuild, seedOrg } from './overview.test-support'
import { setupProviderTests } from './providers.test-support'
import { operatorWrite } from './waitlist.test-support'
import {
  seedSwitchImage,
  seedSwitchBlockingJob,
  makeRecordedSwitchBuild,
} from './provider-switch-record.test-support'

const fixtureForTest = setupProviderTests()

it('records the switch and selected job stop, then waits for Lift before changing the account or starting a build', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'org/with%id' })
  await seedSwitchImage(harness, 'org/with%id')
  await harness.env.DB.prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, 'org/with%id')
    .run()
  await seedBuild(harness, {
    id: 'admin-build',
    orgId: 'org/with%id',
    kind: 'build',
    state: 'running',
    phase: 'install',
  })
  await harness.env.DB.prepare(
    `UPDATE image_builds SET started_by_user_id = (SELECT id FROM users WHERE github_id = 7)
     WHERE id = 'admin-build'`,
  ).run()
  const reply = await harness.request(
    operatorOrgSwitchPath('org/with%id'),
    cookie,
    operatorWrite({ providerAccount: 'e2b', endRunningJob: true }),
  )
  expect(reply.status).toBe(200)
  const body: OperatorOrgSwitchResponse = await reply.json()
  expect(body).toEqual({
    switch: {
      id: expect.any(String),
      orgId: 'org/with%id',
      fromAccount: 'boat',
      toAccount: 'e2b',
      requestedAt: TEST_TIME,
      operator: { githubId: 7, login: 'octocat' },
      endRunningJob: true,
      endRunningJobId: 'admin-build',
      state: 'waiting',
      waitReason: 'suspended',
      waitingJob: null,
      buildId: null,
      buildStartedAt: null,
      buildCompletedAt: null,
      failure: null,
      accountChangedAt: null,
      stoppedAt: null,
      stoppedBy: null,
    },
  })
  expect(
    await harness.env.DB.prepare(
      `SELECT from_account, to_account, end_running_job, end_running_job_id, state,
     requested_at, operator_user_id = (SELECT id FROM users WHERE github_id = 7) AS correct_operator
     FROM org_provider_switches`,
    ).first(),
  ).toEqual({
    from_account: 'boat',
    to_account: 'e2b',
    end_running_job: 1,
    end_running_job_id: 'admin-build',
    state: 'waiting',
    requested_at: TEST_TIME,
    correct_operator: 1,
  })
  const page = await orgPage(harness, cookie, 'org/with%id')
  expect(page.providerAccount).toBe('boat')
  expect(page.providerSwitch).toEqual(body.switch)
  expect(page.lastProviderSwitch).toBeNull()
  expect(page.runningJob).toEqual(body.switch?.waitingJob)
  expect(page.switchWaitReason).toBe('suspended')
  expect(
    (
      await harness.env.DB.prepare(
        'SELECT id, state FROM image_builds ORDER BY id',
      ).all()
    ).results,
  ).toEqual([
    { id: 'admin-build', state: 'failed' },
    { id: 'source-build', state: 'succeeded' },
  ])
  expect(harness.boat.requests).toEqual([])
})

it('accepts only another configured account and a boolean job stop choice', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'org' })
  for (const body of [
    {},
    { providerAccount: 'boat' },
    { providerAccount: 'unknown' },
    { providerAccount: 'toString' },
    { providerAccount: 1 },
    { providerAccount: 'e2b', endRunningJob: 'yes' },
  ]) {
    const reply = await harness.request(
      operatorOrgSwitchPath('org'),
      cookie,
      operatorWrite(body),
    )
    expect(reply.status, JSON.stringify(body)).toBe(400)
    expect(await reply.json()).toMatchObject({
      error: { code: 'invalid_input' },
    })
  }
  harness.env.SANDBOX_PROVIDER_ACCOUNTS = undefined
  const missing = await harness.request(
    operatorOrgSwitchPath('org'),
    cookie,
    operatorWrite({ providerAccount: 'e2b' }),
  )
  expect(missing.status).toBe(400)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) FROM org_provider_switches',
    ).first('COUNT(*)'),
  ).toBe(0)
})

it('keeps one open switch when operator requests overlap and permits a new switch after a stop', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'org' })
  await seedSwitchBlockingJob(harness, 'org')
  const path = operatorOrgSwitchPath('org')
  const start = () =>
    harness.request(path, cookie, operatorWrite({ providerAccount: 'e2b' }))
  const replies = await Promise.all([start(), start()])
  expect(replies.map((reply) => reply.status)).toEqual([200, 200])
  expect(await replies[0].json()).toEqual(await replies[1].json())
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) FROM org_provider_switches',
    ).first('COUNT(*)'),
  ).toBe(1)
  await makeRecordedSwitchBuild(harness, 'org')
  const repeated = await harness.request(
    path,
    cookie,
    operatorWrite({ providerAccount: 'e2b', endRunningJob: true }),
  )
  expect(repeated.status).toBe(200)
  expect(await repeated.json()).toMatchObject({
    switch: { state: 'building', endRunningJob: false },
  })
  expect(
    (await harness.request(path, cookie, operatorWrite({}, 'DELETE'))).status,
  ).toBe(200)
  await seedSwitchBlockingJob(harness, 'org', 'next-build')
  expect((await start()).status).toBe(200)
  expect(
    (
      await harness.env.DB.prepare(
        'SELECT state FROM org_provider_switches ORDER BY rowid',
      ).all()
    ).results,
  ).toEqual([{ state: 'stopped' }, { state: 'waiting' }])
})

it('keeps the first stop operator and time and hides the stopped switch on the org page', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'org' })
  await seedSwitchBlockingJob(harness, 'org')
  const path = operatorOrgSwitchPath('org')
  expect(
    (await harness.request(path, cookie, operatorWrite({}, 'DELETE'))).status,
  ).toBe(200)
  expect(
    (
      await harness.request(
        path,
        cookie,
        operatorWrite({ providerAccount: 'e2b' }),
      )
    ).status,
  ).toBe(200)
  harness.github.profile = { id: 8, login: 'other-operator' }
  harness.env.OPERATOR_GITHUB_IDS = '7,8'
  const other = await harness.login()
  harness.setTime(TEST_TIME + 100)
  const stopped = await harness.request(
    path,
    other,
    operatorWrite({}, 'DELETE'),
  )
  expect(stopped.status).toBe(200)
  expect(await stopped.json()).toMatchObject({
    switch: {
      state: 'stopped',
      stoppedAt: TEST_TIME + 100,
      stoppedBy: { githubId: 8, login: 'other-operator' },
      operator: { githubId: 7, login: 'octocat' },
    },
  })
  harness.setTime(TEST_TIME + 200)
  const repeated = await harness.request(
    path,
    cookie,
    operatorWrite({}, 'DELETE'),
  )
  expect(repeated.status).toBe(200)
  expect(await repeated.json()).toEqual({ switch: null })
  expect(
    await harness.env.DB.prepare(
      `SELECT stopped_at, stopped_by_user_id = (SELECT id FROM users WHERE github_id = 8) AS correct_operator
     FROM org_provider_switches`,
    ).first(),
  ).toEqual({ stopped_at: TEST_TIME + 100, correct_operator: 1 })
  const page = await orgPage(harness, cookie, 'org')
  expect(page.providerSwitch).toBeNull()
  expect(page.providerAccount).toBe('boat')
})
