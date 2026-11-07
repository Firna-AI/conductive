import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import {
  createHarness,
  responseCookie,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import { SESSION_COOKIE } from './cookies'

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

it('starts GitHub authorization with browser state and PKCE', async () => {
  const response = await harness.fetch(API_PATHS.githubSignIn)
  expect(response.status).toBe(302)
  const location = new URL(response.headers.get('Location') ?? '')
  expect(location.origin + location.pathname).toBe(
    'https://github.com/login/oauth/authorize',
  )
  expect(location.searchParams.get('redirect_uri')).toBe(
    `${TEST_ORIGIN}${API_PATHS.githubCallback}`,
  )
  expect(location.searchParams.get('client_id')).toBe('github-client-id')
  expect(location.searchParams.get('code_challenge_method')).toBe('S256')
  expect(location.searchParams.get('code_challenge')).toBe(
    'Tk2iy5JVIQbFdCtEHFbSvPvF7oigi2zbM_qUhhmLaKU',
  )
  expect(location.searchParams.has('scope')).toBe(false)
  expect(response.headers.get('Set-Cookie')).toContain(
    'HttpOnly; Secure; SameSite=Lax',
  )
  expect(response.headers.get('Cache-Control')).toBe('no-store')
})

it('signs in a GitHub user without an email or an account-age check', async () => {
  const session = await harness.login()
  const response = await harness.request(API_PATHS.session, session)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    user: { githubId: 7, githubLogin: 'octocat' },
  })
  expect(session).not.toContain('github-test-token')
  const calls = harness.github.requests
  expect(await calls[0].json()).toMatchObject({
    client_id: 'github-client-id',
    client_secret: 'github-client-secret',
    code: 'good-code',
    code_verifier: expect.any(String),
  })
  expect(calls[1].headers.get('Authorization')).toBe('Bearer github-test-token')
  expect(new URL(calls[2].url).pathname).toBe('/user/emails')
  expect(calls[2].headers.get('Authorization')).toBe('Bearer github-test-token')
})

it('binds the callback to its browser and consumes state only once', async () => {
  const start = await harness.beginSignIn()
  const path = `${API_PATHS.githubCallback}?state=${start.state}&code=good-code`
  const before = harness.github.requests.length
  expect((await harness.fetch(path)).status).toBe(400)
  expect(harness.github.requests.length).toBe(before)
  const callback = await harness.fetch(path, {
    headers: { Cookie: start.cookie },
  })
  expect(callback.status).toBe(302)
  expect(
    callback.headers
      .getSetCookie()
      .find((value) => value.startsWith(SESSION_COOKIE)),
  ).toContain('HttpOnly; Secure; SameSite=Lax')
  expect(responseCookie(callback, SESSION_COOKIE)).toMatch(
    /^__Host-conductive-session=/,
  )
  expect(callback.headers.get('Set-Cookie')).toContain('Max-Age=0')
  expect(
    (await harness.fetch(path, { headers: { Cookie: start.cookie } })).status,
  ).toBe(400)
  expect(harness.github.requests.length).toBe(before + 3)
})

it('keeps the same user record when the GitHub login changes', async () => {
  const first = await harness.login()
  const before = await harness.request(API_PATHS.session, first)
  harness.github.profile = { id: 7, login: 'new-login' }
  const second = await harness.login()
  const after = await harness.request(API_PATHS.session, second)
  const original: { user: { id: string } } = await before.json()
  expect(await after.json()).toMatchObject({
    user: { id: original.user.id, githubLogin: 'new-login' },
  })
  expect(
    await harness.env.DB.prepare('SELECT COUNT(*) AS count FROM users').first(
      'count',
    ),
  ).toBe(1)
})

it('keeps failed GitHub authorization out of the session store', async () => {
  const start = await harness.beginSignIn()
  harness.github.tokenStatus = 401
  const response = await harness.fetch(
    `${API_PATHS.githubCallback}?state=${start.state}&code=refused`,
    { headers: { Cookie: start.cookie } },
  )
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual({
    error: {
      code: 'github_sign_in_failed',
      message: 'GitHub sign-in failed. Start sign-in again.',
    },
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM sessions',
    ).first('count'),
  ).toBe(0)
})

it('refuses cancelled authorization and expired or mismatched browser state', async () => {
  const start = await harness.beginSignIn()
  const cancelled = await harness.fetch(
    `${API_PATHS.githubCallback}?state=${start.state}&error=access_denied`,
    { headers: { Cookie: start.cookie } },
  )
  expect(cancelled.status).toBe(400)
  expect(await cancelled.json()).toMatchObject({
    error: { code: 'github_authorization_denied' },
  })
  const next = await harness.beginSignIn()
  expect(
    (
      await harness.fetch(`${API_PATHS.githubCallback}?state=wrong&code=code`, {
        headers: { Cookie: next.cookie },
      })
    ).status,
  ).toBe(400)
  harness.setTime(1_800_000_600_000)
  expect(
    (
      await harness.fetch(
        `${API_PATHS.githubCallback}?state=${next.state}&code=code`,
        { headers: { Cookie: next.cookie } },
      )
    ).status,
  ).toBe(400)
  expect(harness.github.requests).toHaveLength(0)
})

it('revokes the signed session when the user signs out', async () => {
  const session = await harness.login()
  const response = await harness.request(API_PATHS.signOut, session, {
    method: 'POST',
    body: '{}',
  })
  expect(response.status).toBe(204)
  expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0')
  expect((await harness.request(API_PATHS.session, session)).status).toBe(401)
})

it('stores verified emails from every GitHub page without exposing them in the session response', async () => {
  harness.github.emailPages = [
    [
      { email: 'First@example.com', verified: true },
      { email: 'unverified@example.com', verified: false },
    ],
    [
      { email: 'SECOND@example.com', verified: true },
      { email: 'FIRST@example.com', verified: true },
    ],
  ]
  const session = await harness.login()
  const response = await harness.request(API_PATHS.session, session)
  expect(await response.json()).toEqual({
    user: {
      id: expect.any(String),
      githubId: 7,
      githubLogin: 'octocat',
      displayName: 'Octocat',
      avatarUrl: null,
    },
  })
  const stored = await harness.env.DB.prepare(
    'SELECT email FROM user_verified_emails ORDER BY email',
  ).all()
  expect(stored.results).toEqual([
    { email: 'first@example.com' },
    { email: 'second@example.com' },
  ])
  const emailRequests = harness.github.requests.filter(
    (request) => new URL(request.url).pathname === '/user/emails',
  )
  expect(
    emailRequests.map((request) =>
      new URL(request.url).searchParams.get('page'),
    ),
  ).toEqual(['1', '2'])
})

it('keeps failed GitHub email reads out of the session store', async () => {
  const start = await harness.beginSignIn()
  harness.github.emailsStatus = 403
  const response = await harness.fetch(
    `${API_PATHS.githubCallback}?state=${start.state}&code=good-code`,
    { headers: { Cookie: start.cookie } },
  )
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual({
    error: {
      code: 'github_sign_in_failed',
      message: 'GitHub sign-in failed. Start sign-in again.',
    },
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM sessions',
    ).first('count'),
  ).toBe(0)
})
