import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { orgSuspensionPath } from '../../src/shared/operator'
import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import { membersClient, signIn, write } from '../members/members-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { orgPage } from './directory.test-support'
import { suspensionEvents, suspensionRequest } from './lift.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.env.DB.prepare('DELETE FROM suspension_events').run()
  await harness.reset()
  harness.env.OPERATOR_GITHUB_IDS = '7'
})
afterAll(async () => harness.dispose())

it('lifts an org once, preserves its deletion, and lets its admin restore it in the remaining window', async () => {
  const operator = await signIn(harness, 7, 'operator')
  const org = await harness.createOrg(operator.session)
  const client = membersClient(harness)
  expect(
    (
      await client.request(
        deleteOrgPath(org.id),
        operator.session,
        write({ name: org.name }),
      )
    ).status,
  ).toBe(200)
  const path = orgSuspensionPath(org.id)
  expect(
    (await suspensionRequest(harness, operator.session, path, 'POST')).status,
  ).toBe(200)
  client.setTime(TEST_TIME + 1_000)
  expect(
    (await suspensionRequest(harness, operator.session, path, 'POST')).status,
  ).toBe(200)
  expect(
    (await client.request(restoreOrgPath(org.id), operator.session, write({})))
      .status,
  ).toBe(403)
  const suspended = await orgPage(harness, operator.session, org.id)
  expect(suspended.suspension).toEqual({
    suspendedAt: TEST_TIME,
    operator: { githubId: 7, login: 'operator' },
  })
  expect(suspended.deletion).toEqual({
    deletedAt: TEST_TIME,
    purgeAt: TEST_TIME + 604_800_000,
  })
  client.setTime(TEST_TIME + 2_000)
  const lifted = await suspensionRequest(
    harness,
    operator.session,
    path,
    'DELETE',
  )
  expect(lifted.status).toBe(200)
  expect(await lifted.json()).toEqual({
    orgId: org.id,
    liftedAt: TEST_TIME + 2_000,
    pendingWorkspaceIds: [],
  })
  const active = await orgPage(harness, operator.session, org.id)
  expect(active.suspension).toBeNull()
  expect(active.deletion).toEqual(suspended.deletion)
  client.setTime(TEST_TIME + 3_000)
  const repeated = await suspensionRequest(
    harness,
    operator.session,
    path,
    'DELETE',
  )
  expect(await repeated.json()).toEqual({
    orgId: org.id,
    liftedAt: null,
    pendingWorkspaceIds: [],
  })
  expect(await suspensionEvents(harness.env.DB)).toEqual([
    {
      targetKind: 'org',
      targetId: org.id,
      action: 'suspend',
      occurredAt: TEST_TIME,
      operatorId: operator.user.id,
    },
    {
      targetKind: 'org',
      targetId: org.id,
      action: 'lift',
      occurredAt: TEST_TIME + 2_000,
      operatorId: operator.user.id,
    },
  ])
  const restored = await client.request(
    restoreOrgPath(org.id),
    operator.session,
    write({}),
  )
  expect(restored.status).toBe(200)
  expect(await restored.json()).toEqual({ org })
  expect((await orgPage(harness, operator.session, org.id)).deletion).toBeNull()
  client.setTime(TEST_TIME + 4_000)
  expect(
    (await suspensionRequest(harness, operator.session, path, 'POST')).status,
  ).toBe(200)
  expect((await orgPage(harness, operator.session, org.id)).suspension).toEqual(
    {
      suspendedAt: TEST_TIME + 4_000,
      operator: { githubId: 7, login: 'operator' },
    },
  )
  expect(await suspensionEvents(harness.env.DB)).toHaveLength(3)
})
