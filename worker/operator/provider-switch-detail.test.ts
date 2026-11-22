import { expect, it } from 'vitest'

import {
  operatorOrgSwitchPath,
  type OperatorOrgSwitchResponse,
} from '../../src/shared/operator-switch'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'
import { TEST_TIME } from '../test-support/harness'
import { addMember, directoryUser, orgPage } from './directory.test-support'
import { seedBuild, seedOrg, seedWorkspace } from './overview.test-support'
import { setupProviderTests } from './providers.test-support'
import { operatorWrite } from './waitlist.test-support'
import { seedSwitchImage } from './provider-switch-record.test-support'

const fixtureForTest = setupProviderTests()

it('returns account counts including removed workspaces and unconfigured accounts only within the org', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'org' })
  await seedOrg(harness, { id: 'outside' })
  await seedWorkspace(harness, { id: 'old', orgId: 'org' })
  await seedWorkspace(harness, {
    id: 'removed',
    orgId: 'org',
    state: 'archived',
    archivedAt: TEST_TIME - WORKSPACE_RESTORE_MS,
  })
  await seedWorkspace(harness, { id: 'new', orgId: 'org' })
  await seedWorkspace(harness, { id: 'unknown-account', orgId: 'org' })
  await seedWorkspace(harness, { id: 'outside-workspace', orgId: 'outside' })
  await harness.env.DB.prepare(
    "UPDATE workspaces SET provider_account = 'e2b' WHERE id = 'new'",
  ).run()
  await harness.env.DB.prepare(
    "UPDATE workspaces SET provider_account = 'retired' WHERE id = 'unknown-account'",
  ).run()
  const page = await orgPage(harness, cookie, 'org')
  expect(page.workspacesByAccount).toEqual([
    { id: 'boat', workspaces: 2 },
    { id: 'e2b', workspaces: 1 },
    { id: 'retired', workspaces: 1 },
  ])
  expect(page.workspaceStates).toEqual({
    running: 3,
    stopped: 0,
    failed: 0,
    archived: 1,
    removed: 1,
  })
})

it('shows the newest failed switch and the last completed switch with separate times and no build log', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'org' })
  await seedSwitchImage(harness, 'org')
  await harness.env.DB.prepare(
    "UPDATE orgs SET suspended_at = ? WHERE id = 'org'",
  )
    .bind(TEST_TIME)
    .run()
  const path = operatorOrgSwitchPath('org')
  const first = await harness.request(
    path,
    cookie,
    operatorWrite({ providerAccount: 'e2b' }),
  )
  expect(first.status).toBe(200)
  await harness.env.DB.prepare(
    "UPDATE org_provider_switches SET state = 'completed', account_changed_at = ? WHERE org_id = 'org'",
  )
    .bind(TEST_TIME + 100)
    .run()
  await harness.env.DB.prepare(
    "UPDATE orgs SET provider_account = 'e2b' WHERE id = 'org'",
  ).run()
  await seedSwitchImage(harness, 'org', 'e2b', 'source-e2b')
  harness.setTime(TEST_TIME + 200)
  const next = await harness.request(
    path,
    cookie,
    operatorWrite({ providerAccount: 'boat' }),
  )
  expect(next.status).toBe(200)
  const record: OperatorOrgSwitchResponse = await next.json()
  await seedBuild(harness, {
    id: 'hidden-build',
    orgId: 'org',
    kind: 'build',
    state: 'failed',
    phase: 'done',
  })
  await harness.env.DB.prepare(
    "INSERT INTO image_build_logs (build_id, event_number, occurred_at, text) VALUES ('hidden-build', 1, ?, 'private script output')",
  )
    .bind(TEST_TIME + 300)
    .run()
  for (const failure of ['provider', 'script', 'time-limit']) {
    await harness.env.DB.prepare(
      `UPDATE org_provider_switches SET state = 'failed', build_id = 'hidden-build',
       build_started_at = ?, build_completed_at = ?, failure_cause = ? WHERE id = ?`,
    )
      .bind(TEST_TIME + 200, TEST_TIME + 300, failure, record.switch?.id)
      .run()
    const page = await orgPage(harness, cookie, 'org')
    expect(page.providerSwitch).toMatchObject({
      fromAccount: 'e2b',
      toAccount: 'boat',
      state: 'failed',
      failure,
      buildId: 'hidden-build',
      requestedAt: TEST_TIME + 200,
      buildStartedAt: TEST_TIME + 200,
      buildCompletedAt: TEST_TIME + 300,
    })
    expect(page.lastProviderSwitch).toMatchObject({
      fromAccount: 'boat',
      toAccount: 'e2b',
      state: 'completed',
      requestedAt: TEST_TIME,
      accountChangedAt: TEST_TIME + 100,
      operator: { githubId: 7, login: 'octocat' },
    })
    expect(JSON.stringify(page)).not.toContain('private script output')
  }
  const again = await harness.request(
    path,
    cookie,
    operatorWrite({ providerAccount: 'boat' }),
  )
  expect(again.status).toBe(200)
  expect((await orgPage(harness, cookie, 'org')).providerSwitch).toMatchObject({
    state: 'waiting',
    failure: null,
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) FROM org_provider_switches',
    ).first('COUNT(*)'),
  ).toBe(3)
})

it('records a refresh wait and each build eligibility wait without refusing a switch', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  for (const id of [
    'refresh',
    'suspended',
    'deleted',
    'admin',
    'ready',
    'no-image',
  ])
    await seedOrg(harness, { id })
  await seedBuild(harness, {
    id: 'refresh-job',
    orgId: 'refresh',
    kind: 'refresh',
    state: 'running',
    phase: 'sources',
  })
  for (const id of ['refresh', 'suspended', 'deleted', 'admin', 'ready'])
    await seedSwitchImage(harness, id, 'boat', `source-${id}`)
  await harness.env.DB.prepare(
    "UPDATE orgs SET suspended_at = ? WHERE id IN ('suspended', 'no-image')",
  )
    .bind(TEST_TIME)
    .run()
  await harness.env.DB.prepare(
    "UPDATE orgs SET deleted_at = ? WHERE id = 'deleted'",
  )
    .bind(TEST_TIME)
    .run()
  await harness.env.DB.prepare(
    "UPDATE org_members SET role = 'member' WHERE org_id = 'admin'",
  ).run()
  await directoryUser(harness, { githubId: 8, login: 'suspended-admin' })
  await addMember(harness, 'admin', 8, 'admin')
  await harness.env.DB.prepare(
    'UPDATE users SET suspended_at = ? WHERE github_id = 8',
  )
    .bind(TEST_TIME)
    .run()
  for (const [id, waitReason, state] of [
    ['refresh', 'job', 'waiting'],
    ['suspended', 'suspended', 'waiting'],
    ['deleted', 'deleted', 'waiting'],
    ['admin', 'admin', 'waiting'],
    ['ready', null, 'building'],
    ['no-image', null, 'completed'],
  ] as const) {
    const reply = await harness.request(
      operatorOrgSwitchPath(id),
      cookie,
      operatorWrite({ providerAccount: 'e2b' }),
    )
    expect(reply.status, id).toBe(200)
    expect(await reply.json()).toMatchObject({
      switch: { state, waitReason, endRunningJob: false },
    })
    expect((await orgPage(harness, cookie, id)).switchWaitReason).toBe(
      state === 'building' ? 'job' : waitReason,
    )
  }
  expect(
    (await orgPage(harness, cookie, 'refresh')).providerSwitch?.waitingJob,
  ).toEqual({
    id: 'refresh-job',
    kind: 'refresh',
    startedAt: TEST_TIME,
    starter: null,
  })
})
