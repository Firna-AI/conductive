import { Miniflare } from 'miniflare'

import { API_PATHS, type Org } from '../../src/shared/api'
import type { SessionResponse } from '../../src/shared/account'
import { acceptedTermsSignInPath } from '../../src/shared/terms'
import { createApp } from '../application'
import type { AppEnv } from '../env'
import { OAUTH_COOKIE, SESSION_COOKIE } from '../security/cookies'
import { seedAppAccess } from './app-access'
import { FakeBoat } from './fake-boat'
import { FakeGitHub } from './fake-github'
import { createTestOrg } from './org-test-support'
import { applyMigrations } from './migrations'

export const TEST_ORIGIN = 'https://app.conductive.test'
export const TEST_TIME = 1_800_000_000_000

export async function createHarness() {
  const runtime = new Miniflare({
    enableDevRegistry: false,
    telemetry: { enabled: false },
    cf: false,
    workers: [
      {
        config: {
          name: 'worker-core-tests',
          compatibilityDate: '2026-11-06',
          env: { DB: { type: 'd1', id: 'test-db' } },
          manifest: {
            mainModule: 'index.js',
            modules: {
              'index.js': {
                type: 'esm',
                contents:
                  'export default { fetch() { return new Response("test") } }',
              },
            },
          },
        },
      },
    ],
  })
  const db = await runtime.getD1Database('DB')
  await applyMigrations(db)
  const env: AppEnv = {
    DB: db,
    APP_ORIGIN: TEST_ORIGIN,
    GITHUB_CLIENT_ID: 'github-client-id',
    GITHUB_CLIENT_SECRET: 'github-client-secret',
    SESSION_SIGNING_KEY: btoa('s'.repeat(32)),
    BOAT_API_KEY: 'boat-first',
    BOAT_ORG_ID: 'app-org',
    BOAT_KEY_ENCRYPTION_KEY: btoa('e'.repeat(32)),
  }
  const github = new FakeGitHub()
  const boat = new FakeBoat()
  let now = TEST_TIME
  let sequence = 0
  const app = createApp({
    now: () => now,
    randomToken: () => `test-${++sequence}`.padEnd(43, 'x'),
    fetch: (request) =>
      new URL(request.url).hostname === 'boat.dev'
        ? boat.fetch(request)
        : github.fetch(request),
  })
  const fetch = (path: string, init?: RequestInit) =>
    app.fetch(new Request(`${TEST_ORIGIN}${path}`, init), env)
  const request = (path: string, session: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    headers.set('Cookie', session)
    headers.set('Origin', TEST_ORIGIN)
    if (init.body) headers.set('Content-Type', 'application/json')
    return fetch(path, { ...init, headers })
  }
  const beginSignIn = async () => {
    const response = await fetch(acceptedTermsSignInPath())
    const location = response.headers.get('Location')
    if (!location) throw new Error(`Sign-in returned ${response.status}`)
    return {
      response,
      state: new URL(location).searchParams.get('state') ?? '',
      cookie: responseCookie(response, OAUTH_COOKIE),
    }
  }
  const login = async ({ appAccess = true } = {}) => {
    const start = await beginSignIn()
    const response = await fetch(
      `${API_PATHS.githubCallback}?state=${start.state}&code=good-code`,
      { headers: { Cookie: start.cookie } },
    )
    if (response.status !== 302)
      throw new Error(
        `Callback returned ${response.status}: ${await response.text()}`,
      )
    const session = responseCookie(response, SESSION_COOKIE)
    if (appAccess) {
      const current = await request(API_PATHS.session, session)
      if (current.status !== 200)
        throw new Error('Sign-in did not save the session')
      const { user }: SessionResponse = await current.json()
      await seedAppAccess(db, [user.id], now)
    }
    return session
  }
  const createOrg = async (
    session: string,
    name = 'Example org',
  ): Promise<Org> => createTestOrg({ github, db, request }, session, name)
  return {
    env,
    github,
    boat,
    fetch,
    request,
    beginSignIn,
    login,
    createOrg,
    reset: async () => {
      await db.batch(
        [
          'github_webhook_deliveries',
          'github_connections',
          'github_installations',
          'org_invites',
          'org_deletion_resources',
          'org_deletion_workspaces',
          'org_deletions',
          'user_preferences',
          'agent_logins',
          'preview_hostnames',
          'workspace_views',
          'workspace_read_states',
          'terminal_credentials',
          'workspace_tokens',
          'section_preferences',
          'workspaces',
          'sections',
          'repositories',
          'settings',
          'image_build_logs',
          'image_builds',
          'org_members',
          'orgs',
          'sessions',
          'access_code_uses',
          'approval_emails',
          'user_app_access',
          'access_codes',
          'users',
          'oauth_states',
        ].map((table) => db.prepare(`DELETE FROM ${table}`)),
      )
      await db
        .prepare(
          `UPDATE signup_settings SET paused = 0, updated_at = NULL, updated_by_user_id = NULL,
           waitlist_on = 1, waitlist_updated_at = NULL, waitlist_updated_by_user_id = NULL WHERE id = 1`,
        )
        .run()
      github.reset()
      boat.reset()
      now = TEST_TIME
      sequence = 0
    },
    setTime: (value: number) => {
      now = value
    },
    dispose: () => runtime.dispose(),
  }
}

export function responseCookie(response: Response, name: string): string {
  const value = response.headers
    .getSetCookie()
    .find((part) => part.startsWith(`${name}=`))
  if (!value) throw new Error(`Missing ${name} cookie`)
  return value.split(';')[0]
}

export type TestHarness = Awaited<ReturnType<typeof createHarness>>
