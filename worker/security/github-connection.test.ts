import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { createHarness, type TestHarness } from '../test-support/harness'
import { decrypt } from './crypto'
import { readGitHubConnection } from './github-connection-store'
import { GitHubTokenTestApp } from './github-test-support'
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

it('keeps the authorization bundle encrypted and out of browser sessions', async () => {
  const app = new GitHubTokenTestApp(harness)
  const { userId, response, session } = await app.signIn()
  const connection = await readGitHubConnection(harness.env.DB, userId)
  expect(connection?.ciphertext ?? '').toMatch(/^v1\./)
  expect(JSON.stringify(connection)).not.toContain('ghu_original')
  expect(JSON.stringify(connection)).not.toContain('ghr_original')
  const stored = await decrypt(
    connection?.ciphertext ?? '',
    `github-connection:${userId}`,
    harness.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  expect(JSON.parse(stored)).toEqual({
    accessToken: 'ghu_original',
    expiresAt: 1_800_000_120_000,
    refreshToken: 'ghr_original',
    refreshExpiresAt: 1_815_897_600_000,
  })
  await expect(
    decrypt(
      connection?.ciphertext ?? '',
      'github-connection:another-user',
      harness.env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  ).rejects.toThrow()
  const browserSession = await app.request(API_PATHS.session, session)
  expect(await browserSession.json()).toMatchObject({
    user: { githubId: 7, githubLogin: 'octocat' },
  })
  const browserOutput = JSON.stringify({
    headers: [...response.headers],
    body: await response.text(),
    session: await (await app.request(API_PATHS.session, session)).text(),
  })
  expect(browserOutput).not.toContain('ghu_original')
  expect(browserOutput).not.toContain('ghr_original')
})

it('uses a non-expiring authorization token without a refresh request', async () => {
  const app = new GitHubTokenTestApp(harness)
  app.authorizationReply = {
    access_token: 'github-test-token',
    token_type: 'bearer',
  }
  const { userId } = await app.signIn()
  app.now += 365 * 24 * 60 * 60 * 1000
  expect(
    await freshGitHubUserToken(harness.env, userId, app.dependencies),
  ).toBe('github-test-token')
  expect(app.refreshRequests).toHaveLength(0)
})

it('refuses a partial expiring bundle without saving a connection or session', async () => {
  const app = new GitHubTokenTestApp(harness)
  app.authorizationReply = {
    access_token: 'ghu_private',
    expires_in: 28_800,
    refresh_token: 'ghr_private',
  }
  const response = await app.authorize()
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual({
    error: {
      code: 'github_sign_in_failed',
      message: 'GitHub sign-in failed. Start sign-in again.',
    },
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) FROM github_connections',
    ).first('COUNT(*)'),
  ).toBe(0)
  expect(
    await harness.env.DB.prepare('SELECT COUNT(*) FROM sessions').first(
      'COUNT(*)',
    ),
  ).toBe(0)
})
