import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS, type User } from '../../src/shared/api'
import { userSuspensionPath } from '../../src/shared/operator'
import {
  desktopHandoff,
  exchangeHandoff,
} from '../security/desktop-http.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  delete harness.env.OPERATOR_GITHUB_IDS
})
afterAll(async () => {
  await harness.dispose()
})

it('lets only a configured operator suspend an account and revoke its sessions', async () => {
  const operator = await harness.login()
  harness.github.profile = { id: 8, login: 'target-user' }
  const target = await harness.login()
  const session = await harness.request(API_PATHS.session, target)
  const { user }: { user: User } = await session.json()
  const path = userSuspensionPath(8)
  const unconfigured = await harness.request(path, operator, {
    method: 'POST',
    body: '{}',
  })
  expect(unconfigured.status).toBe(403)
  harness.env.OPERATOR_GITHUB_IDS = '7'
  const forbidden = await harness.request(path, target, {
    method: 'POST',
    body: '{}',
  })
  expect(forbidden.status).toBe(403)
  expect(await forbidden.json()).toEqual({
    error: {
      code: 'operator_required',
      message: 'Operator access is required.',
    },
  })
  expect((await harness.request(API_PATHS.session, target)).status).toBe(200)
  const suspended = await harness.request(path, operator, {
    method: 'POST',
    body: '{}',
  })
  expect(suspended.status).toBe(200)
  expect(await suspended.json()).toEqual({
    userId: user.id,
    suspendedAt: TEST_TIME,
    pendingWorkspaceIds: [],
    pendingBuildIds: [],
  })
  expect((await harness.request(API_PATHS.session, target)).status).toBe(401)
  expect((await harness.request(API_PATHS.session, operator)).status).toBe(200)
  harness.setTime(TEST_TIME + 1_000)
  const repeated = await harness.request(path, operator, {
    method: 'POST',
    body: '{}',
  })
  expect(repeated.status).toBe(200)
  expect(await repeated.json()).toEqual({
    userId: user.id,
    suspendedAt: TEST_TIME,
    pendingWorkspaceIds: [],
    pendingBuildIds: [],
  })
  const start = await harness.beginSignIn()
  const signIn = await harness.fetch(
    `${API_PATHS.githubCallback}?state=${start.state}&code=good-code`,
    { headers: { Cookie: start.cookie } },
  )
  expect(signIn.status).toBe(403)
  expect(await signIn.json()).toEqual({
    error: { code: 'user_suspended', message: 'This account is suspended.' },
  })
})

it('rejects a desktop handoff when its user is suspended before the exchange', async () => {
  const operator = await harness.login()
  harness.env.OPERATOR_GITHUB_IDS = '7'
  harness.github.profile = { id: 8, login: 'desktop-user' }
  const verifier = 'v'.repeat(43)
  const callback = await desktopHandoff(harness, verifier)
  expect(callback.status).toBe(302)
  const suspended = await harness.request(userSuspensionPath(8), operator, {
    method: 'POST',
    body: '{}',
  })
  expect(suspended.status).toBe(200)
  const exchange = await exchangeHandoff(harness, callback, verifier)
  expect(exchange.status).toBe(403)
  expect(await exchange.json()).toEqual({
    error: { code: 'user_suspended', message: 'This account is suspended.' },
  })
  expect(exchange.headers.get('Set-Cookie')).toBeNull()
})
