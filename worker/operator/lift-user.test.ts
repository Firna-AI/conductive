import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { userSuspensionPath } from '../../src/shared/operator'
import { authenticateWorkspaceToken } from '../lifecycle/tokens'
import { signIn } from '../members/members-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { userPage } from './directory.test-support'
import {
  suspensionEvents,
  suspensionRequest,
  userResources,
} from './lift.test-support'

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

it('lifts a user once, records each change, and permits a fresh sign-in without reviving old access', async () => {
  const operator = await signIn(harness, 7, 'first-operator')
  const target = await signIn(harness, 8, 'target-user')
  const second = await signIn(harness, 9, 'second-operator')
  const token = await userResources(harness, target.user)
  const path = userSuspensionPath(8)
  const suspended = await suspensionRequest(
    harness,
    operator.session,
    path,
    'POST',
  )
  expect(suspended.status).toBe(202)
  expect(await suspended.json()).toEqual({
    userId: target.user.id,
    suspendedAt: TEST_TIME,
    pendingWorkspaceIds: ['owned-workspace'],
    pendingBuildIds: [],
  })
  harness.setTime(TEST_TIME + 1_000)
  expect(
    (await suspensionRequest(harness, second.session, path, 'POST')).status,
  ).toBe(202)
  expect((await userPage(harness, operator.session, 8)).suspension).toEqual({
    suspendedAt: TEST_TIME,
    operator: { githubId: 7, login: 'first-operator' },
  })
  harness.setTime(TEST_TIME + 2_000)
  const lifted = await suspensionRequest(
    harness,
    second.session,
    path,
    'DELETE',
  )
  expect(lifted.status).toBe(200)
  expect(await lifted.json()).toEqual({
    userId: target.user.id,
    liftedAt: TEST_TIME + 2_000,
    pendingWorkspaceIds: ['owned-workspace'],
  })
  expect((await userPage(harness, operator.session, 8)).suspension).toBeNull()
  expect(
    (await harness.request(API_PATHS.session, target.session)).status,
  ).toBe(401)
  await expect(
    authenticateWorkspaceToken(harness.env, token),
  ).rejects.toMatchObject({ code: 'workspace_token_refused' })
  expect(
    await harness.env.DB.prepare(
      'SELECT revoked_at FROM preview_hostnames WHERE id = ?',
    )
      .bind('preview')
      .first('revoked_at'),
  ).toBe(TEST_TIME)
  expect(
    await harness.env.DB.prepare('SELECT state FROM image_builds WHERE id = ?')
      .bind('failed-build')
      .first('state'),
  ).toBe('failed')
  const signedInAgain = await signIn(harness, 8, 'target-user')
  expect(
    (await harness.request(API_PATHS.session, signedInAgain.session)).status,
  ).toBe(200)
  expect(
    (await harness.request(API_PATHS.session, target.session)).status,
  ).toBe(401)
  harness.setTime(TEST_TIME + 3_000)
  const repeated = await suspensionRequest(
    harness,
    operator.session,
    path,
    'DELETE',
  )
  expect(await repeated.json()).toEqual({
    userId: target.user.id,
    liftedAt: null,
    pendingWorkspaceIds: [],
  })
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
      occurredAt: TEST_TIME + 2_000,
      operatorId: second.user.id,
    },
  ])
  harness.setTime(TEST_TIME + 4_000)
  expect(
    (await suspensionRequest(harness, second.session, path, 'POST')).status,
  ).toBe(202)
  expect((await userPage(harness, operator.session, 8)).suspension).toEqual({
    suspendedAt: TEST_TIME + 4_000,
    operator: { githubId: 9, login: 'second-operator' },
  })
  expect(await suspensionEvents(harness.env.DB)).toHaveLength(3)
})
