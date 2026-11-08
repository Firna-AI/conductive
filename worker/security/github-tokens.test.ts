import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { errorResponse } from '../http'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readGitHubConnection } from './github-connection-store'
import {
  expiringGitHubReply,
  GitHubTokenTestApp,
  refreshSignal,
} from './github-test-support'
import { freshGitHubUserToken } from './github-tokens'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})
beforeEach(async () => {
  await harness.reset()
})

it('renews before expiry and reuses the still-valid rotated access token', async () => {
  const app = new GitHubTokenTestApp(harness)
  const { userId } = await app.signIn()
  app.now = TEST_TIME + 59_999
  expect(
    await freshGitHubUserToken(harness.env, userId, app.dependencies),
  ).toBe('ghu_original')
  expect(app.refreshRequests).toHaveLength(0)
  app.now = TEST_TIME + 60_001
  expect(
    await freshGitHubUserToken(harness.env, userId, app.dependencies),
  ).toBe('ghu_renewed')
  expect(
    await freshGitHubUserToken(harness.env, userId, app.dependencies),
  ).toBe('ghu_renewed')
  expect(app.refreshRequests).toHaveLength(1)
  expect(await app.refreshRequests[0].json()).toEqual({
    client_id: 'github-client-id',
    client_secret: 'github-client-secret',
    grant_type: 'refresh_token',
    refresh_token: 'ghr_original',
  })
  expect(
    JSON.stringify(await readGitHubConnection(harness.env.DB, userId)),
  ).not.toContain('ghr_renewed')
})

it('serializes competing refreshes and returns the same rotated bundle', async () => {
  const app = new GitHubTokenTestApp(harness)
  const { userId } = await app.signIn()
  app.now = TEST_TIME + 60_001
  const started = refreshSignal()
  const release = refreshSignal()
  const contenderReady = refreshSignal()
  app.onRefresh = async (count) => {
    if (count > 1) {
      contenderReady.resolve()
      return Response.json({ error: 'bad_refresh_token' })
    }
    started.resolve()
    await release.promise
  }
  const first = freshGitHubUserToken(harness.env, userId, app.dependencies)
  await started.promise
  const second = freshGitHubUserToken(harness.env, userId, {
    ...app.dependencies,
    wait: async () => {
      contenderReady.resolve()
      await release.promise
    },
  })
  void second.then(contenderReady.resolve, contenderReady.resolve)
  const results = Promise.allSettled([first, second])
  await contenderReady.promise
  try {
    expect(app.refreshRequests).toHaveLength(1)
  } finally {
    release.resolve()
  }
  expect(await results).toEqual([
    { status: 'fulfilled', value: 'ghu_renewed' },
    { status: 'fulfilled', value: 'ghu_renewed' },
  ])
  expect(app.refreshRequests).toHaveLength(1)
})

it('keeps a newer sign-in when an earlier refresh finishes later', async () => {
  const app = new GitHubTokenTestApp(harness)
  const { userId } = await app.signIn()
  app.now = TEST_TIME + 60_001
  const started = refreshSignal()
  const release = refreshSignal()
  app.onRefresh = async () => {
    started.resolve()
    await release.promise
  }
  const refresh = freshGitHubUserToken(harness.env, userId, app.dependencies)
  await started.promise
  app.authorizationReply = expiringGitHubReply(
    'ghu_new_signin',
    'ghr_new_signin',
  )
  await app.signIn()
  release.resolve()
  expect(await refresh).toBe('ghu_new_signin')
  expect(
    await freshGitHubUserToken(harness.env, userId, app.dependencies),
  ).toBe('ghu_new_signin')
  expect(app.refreshRequests).toHaveLength(1)
})

it('does not reuse a one-time refresh after its owner stops responding', async () => {
  const app = new GitHubTokenTestApp(harness)
  const { userId } = await app.signIn()
  app.now = TEST_TIME + 60_001
  const started = refreshSignal()
  const release = refreshSignal()
  app.onRefresh = async () => {
    started.resolve()
    await release.promise
  }
  const refresh = freshGitHubUserToken(harness.env, userId, app.dependencies)
  await started.promise
  app.now += 35_001
  try {
    await expect(
      freshGitHubUserToken(harness.env, userId, app.dependencies),
    ).rejects.toMatchObject({
      status: 401,
      code: 'github_reconnect_required',
    })
    expect(app.refreshRequests).toHaveLength(1)
  } finally {
    release.resolve()
  }
  expect(await refresh).toBe('ghu_renewed')
})

it('sanitizes failed refresh replies and recovers through a new sign-in', async () => {
  const app = new GitHubTokenTestApp(harness)
  const { userId } = await app.signIn()
  app.now = TEST_TIME + 60_001
  app.refreshReply = {
    access_token: 'ghu_private_reply',
    refresh_token: 'ghr_private_reply',
    expires_in: -1,
    error_description: 'ghr_original',
  }
  const response = await freshGitHubUserToken(
    harness.env,
    userId,
    app.dependencies,
  ).then(() => new Response('unexpected token'), errorResponse)
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual({
    error: {
      code: 'github_refresh_failed',
      message: 'GitHub access failed. Sign in with GitHub again.',
    },
  })
  app.now += 35_001
  await expect(
    freshGitHubUserToken(harness.env, userId, app.dependencies),
  ).rejects.toMatchObject({
    code: 'github_reconnect_required',
  })
  expect(app.refreshRequests).toHaveLength(1)
  app.authorizationReply = expiringGitHubReply(
    'ghu_reconnected',
    'ghr_reconnected',
  )
  await app.signIn()
  expect(
    await freshGitHubUserToken(harness.env, userId, app.dependencies),
  ).toBe('ghu_reconnected')
})
