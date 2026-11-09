import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  orgSuspensionPath,
  userSuspensionPath,
} from '../../src/shared/operator'
import { signIn } from '../members/members-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { userPage } from './directory.test-support'
import { suspensionEvents, suspensionRequest } from './lift.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.env.DB.prepare('DELETE FROM suspension_events').run()
  await harness.reset()
  harness.env.OPERATOR_GITHUB_IDS = '7,9'
})
afterAll(async () => harness.dispose())

it('records one event per user or org state change when matching requests arrive together', async () => {
  const operator = await signIn(harness, 7, 'operator')
  const target = await signIn(harness, 8, 'target')
  const org = await harness.createOrg(operator.session)
  for (const entry of [
    { path: userSuspensionPath(8), target: { userId: target.user.id } },
    { path: orgSuspensionPath(org.id), target: { orgId: org.id } },
  ]) {
    const path = entry.path
    const inactive = await suspensionRequest(
      harness,
      operator.session,
      path,
      'DELETE',
    )
    expect(inactive.status).toBe(200)
    expect(await inactive.json()).toMatchObject({
      liftedAt: null,
      pendingWorkspaceIds: [],
    })
    const suspensions = await Promise.all([
      suspensionRequest(harness, operator.session, path, 'POST'),
      suspensionRequest(harness, operator.session, path, 'POST'),
    ])
    expect(suspensions.map((response) => response.status)).toEqual([200, 200])
    const lifts = await Promise.all([
      suspensionRequest(harness, operator.session, path, 'DELETE'),
      suspensionRequest(harness, operator.session, path, 'DELETE'),
    ])
    expect(lifts.map((response) => response.status)).toEqual([200, 200])
    const bodies: unknown = await Promise.all(
      lifts.map((response) => response.json()),
    )
    expect(bodies).toEqual(
      expect.arrayContaining([
        { ...entry.target, liftedAt: TEST_TIME, pendingWorkspaceIds: [] },
        { ...entry.target, liftedAt: null, pendingWorkspaceIds: [] },
      ]),
    )
  }
  expect(await suspensionEvents(harness.env.DB)).toEqual([
    {
      targetKind: 'user',
      targetId: target.user.id,
      action: 'suspend',
      occurredAt: TEST_TIME,
      operatorId: operator.user.id,
    },
    {
      targetKind: 'user',
      targetId: target.user.id,
      action: 'lift',
      occurredAt: TEST_TIME,
      operatorId: operator.user.id,
    },
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
      occurredAt: TEST_TIME,
      operatorId: operator.user.id,
    },
  ])
})

it('keeps events when an operator or target is deleted and keeps the first operator on a repeated suspension', async () => {
  const operator = await signIn(harness, 7, 'first-operator')
  const target = await signIn(harness, 8, 'target')
  const second = await signIn(harness, 9, 'second-operator')
  const path = userSuspensionPath(8)
  expect(
    (await suspensionRequest(harness, operator.session, path, 'POST')).status,
  ).toBe(200)
  await harness.env.DB.prepare('DELETE FROM users WHERE id = ?')
    .bind(operator.user.id)
    .run()
  expect(
    (await suspensionRequest(harness, second.session, path, 'POST')).status,
  ).toBe(200)
  expect((await userPage(harness, second.session, 8)).suspension).toEqual({
    suspendedAt: TEST_TIME,
    operator: null,
  })
  harness.setTime(TEST_TIME + 1_000)
  expect(
    (await suspensionRequest(harness, second.session, path, 'DELETE')).status,
  ).toBe(200)
  await harness.env.DB.prepare('DELETE FROM users WHERE id = ?')
    .bind(second.user.id)
    .run()
  await harness.env.DB.prepare('DELETE FROM users WHERE id = ?')
    .bind(target.user.id)
    .run()
  expect(await suspensionEvents(harness.env.DB)).toEqual([
    {
      targetKind: 'user',
      targetId: target.user.id,
      action: 'suspend',
      occurredAt: TEST_TIME,
      operatorId: null,
    },
    {
      targetKind: 'user',
      targetId: target.user.id,
      action: 'lift',
      occurredAt: TEST_TIME + 1_000,
      operatorId: null,
    },
  ])
})
