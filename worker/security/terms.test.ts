import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { acceptedTermsSignInPath, TERMS_VERSION } from '../../src/shared/terms'
import { saveOAuthState } from '../data/users'
import {
  createHarness,
  responseCookie,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { OAUTH_COOKIE, cookie } from './cookies'
import { hash, sign } from './crypto'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

async function authorize(startPath: string, callbackQuery = '') {
  if (startPath === API_PATHS.githubSignIn) {
    const expiresAt = TEST_TIME + 600_000
    await saveOAuthState(
      harness.env.DB,
      await hash('legacy-state'),
      expiresAt,
      TEST_TIME,
    )
    const token = await sign(
      { state: 'legacy-state', verifier: 'v'.repeat(43), expiresAt },
      'github-state',
      harness.env.SESSION_SIGNING_KEY,
    )
    return harness.fetch(
      `${API_PATHS.githubCallback}?state=legacy-state&code=good-code${callbackQuery}`,
      { headers: { Cookie: cookie(OAUTH_COOKIE, token, 600) } },
    )
  }
  const start = await harness.fetch(startPath)
  const state = new URL(start.headers.get('Location') ?? '').searchParams.get(
    'state',
  )
  return harness.fetch(
    `${API_PATHS.githubCallback}?state=${state}&code=good-code${callbackQuery}`,
    { headers: { Cookie: responseCookie(start, OAUTH_COOKIE) } },
  )
}

it('requires consent at OAuth start before it creates a new account', async () => {
  const refused = await authorize(
    API_PATHS.githubSignIn,
    `&terms_version=${TERMS_VERSION}`,
  )
  expect(refused.status).toBe(403)
  expect(await refused.json()).toEqual({
    error: {
      code: 'terms_acceptance_required',
      message: 'Accept the Terms to create your account.',
    },
  })
  expect(
    await harness.env.DB.prepare('SELECT COUNT(*) AS count FROM users').first(
      'count',
    ),
  ).toBe(0)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM sessions',
    ).first('count'),
  ).toBe(0)
  const accepted = await authorize(acceptedTermsSignInPath())
  expect(accepted.status).toBe(302)
  expect(
    await harness.env.DB.prepare(
      'SELECT terms_version AS version, terms_accepted_at AS acceptedAt FROM users WHERE github_id = 7',
    ).first(),
  ).toEqual({
    version:
      '2026-11-11-conductor-import-gateway-actions-sessions-archive-restore-routines-feedback',
    acceptedAt: TEST_TIME,
  })
  harness.setTime(TEST_TIME + 1_000)
  expect((await authorize(acceptedTermsSignInPath())).status).toBe(302)
  expect(
    await harness.env.DB.prepare(
      'SELECT terms_version AS version, terms_accepted_at AS acceptedAt FROM users WHERE github_id = 7',
    ).first(),
  ).toEqual({ version: TERMS_VERSION, acceptedAt: TEST_TIME })
})

it('records explicit consent for an existing account and keeps its identity', async () => {
  await harness.env.DB.prepare(
    "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('existing-user', 7, 'old-login', 0, 0)",
  ).run()
  expect(
    (await authorize(API_PATHS.githubSignIn, `&terms_version=${TERMS_VERSION}`))
      .status,
  ).toBe(302)
  expect(
    await harness.env.DB.prepare(
      'SELECT id, github_login AS login, created_at AS createdAt, terms_version AS version, terms_accepted_at AS acceptedAt FROM users WHERE github_id = 7',
    ).first(),
  ).toEqual({
    id: 'existing-user',
    login: 'octocat',
    createdAt: 0,
    version: null,
    acceptedAt: null,
  })
  harness.setTime(TEST_TIME + 1_000)
  expect((await authorize(acceptedTermsSignInPath())).status).toBe(302)
  expect(
    await harness.env.DB.prepare(
      'SELECT id, github_login AS login, created_at AS createdAt, terms_version AS version, terms_accepted_at AS acceptedAt FROM users WHERE github_id = 7',
    ).first(),
  ).toEqual({
    id: 'existing-user',
    login: 'octocat',
    createdAt: 0,
    version: TERMS_VERSION,
    acceptedAt: TEST_TIME + 1_000,
  })
})

it('replaces an old consent revision only after explicit current consent', async () => {
  await harness.env.DB.prepare(
    "INSERT INTO users (id, github_id, github_login, created_at, updated_at, terms_version, terms_accepted_at) VALUES ('existing-user', 7, 'old-login', 0, 0, '2026-11-08', ?)",
  )
    .bind(TEST_TIME - 10_000)
    .run()
  expect(
    (await authorize(API_PATHS.githubSignIn, `&terms_version=${TERMS_VERSION}`))
      .status,
  ).toBe(302)
  expect(
    await harness.env.DB.prepare(
      'SELECT terms_version AS version, terms_accepted_at AS acceptedAt FROM users WHERE github_id = 7',
    ).first(),
  ).toEqual({ version: '2026-11-08', acceptedAt: TEST_TIME - 10_000 })
  harness.setTime(TEST_TIME + 1_000)
  expect((await authorize(acceptedTermsSignInPath())).status).toBe(302)
  expect(
    await harness.env.DB.prepare(
      'SELECT terms_version AS version, terms_accepted_at AS acceptedAt FROM users WHERE github_id = 7',
    ).first(),
  ).toEqual({
    version: TERMS_VERSION,
    acceptedAt: TEST_TIME + 1_000,
  })
})
