import { afterEach, beforeAll, expect, it } from 'vitest'

import { GET_STARTED_PATH } from '../../src/shared/onboarding'
import { shellGitHubCatalog } from '../app-api/feature-shell.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { SESSION_COOKIE } from '../security/cookies'
import { sign } from '../security/crypto'
import { saveGitHubTokens } from '../security/github-tokens'
import { saveSession } from '../data/users'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('marks the GitHub installation step complete before the first org exists', async () => {
  const active = (fixture = await featureFixture(bundle))
  await shellGitHubCatalog(active)
  await active.env.DB.prepare(
    "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('new-user', 104, 'new-user', 1, 1)",
  ).run()
  const sessionId = 'new-user-session'
  const expiresAt = 4_000_000_000_000
  await saveSession(active.env.DB, sessionId, 'new-user', expiresAt, Date.now())
  const cookie = `${SESSION_COOKIE}=${await sign({ sessionId, expiresAt }, 'session', active.env.SESSION_SIGNING_KEY)}`
  const request = () =>
    active.request(GET_STARTED_PATH, { headers: { Cookie: cookie } })
  const initial = await request()
  expect(initial.status).toBe(200)
  expect(await initial.json()).toEqual({
    orgId: null,
    steps: [
      { step: 'github-app', complete: false },
      { step: 'org', complete: false },
      { step: 'agent-login', complete: false },
    ],
  })
  await saveGitHubTokens(
    active.env,
    'new-user',
    {
      accessToken: 'new-user-token',
      refreshToken: null,
      expiresAt: null,
      refreshExpiresAt: null,
    },
    Date.now(),
  )
  const installed = await request()
  expect(installed.status).toBe(200)
  expect(await installed.json()).toEqual({
    orgId: null,
    steps: [
      { step: 'github-app', complete: true },
      { step: 'org', complete: false },
      { step: 'agent-login', complete: false },
    ],
  })
})
