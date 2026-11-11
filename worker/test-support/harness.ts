import { API_PATHS, type Org } from '../../src/shared/api'
import type { SessionResponse } from '../../src/shared/account'
import { acceptedTermsSignInPath } from '../../src/shared/terms'
import { createApp } from '../application'
import type { AppEnv } from '../env'
import { OAUTH_COOKIE, SESSION_COOKIE } from '../security/cookies'
import { FakeBoat } from './fake-boat'
import { FakeGitHub } from './fake-github'
import { createTestOrg } from './org-test-support'
import { applyMigrations } from './migrations'
import { seedAppAccess } from './app-access'
import { createNativeRuntime } from './native-runtime'
import { NATIVE_TEST_TIME } from './native-workspace-api'

export const TEST_ORIGIN = 'https://app.conductive.test'
export const TEST_TIME = NATIVE_TEST_TIME

export async function createHarness() {
  const github = new FakeGitHub()
  const boat = new FakeBoat()
  let send = (request: Request) =>
    new URL(request.url).hostname === 'boat.dev'
      ? boat.fetch(request)
      : github.fetch(request)
  const variables = {
    APP_ORIGIN: TEST_ORIGIN,
    MACHINE_ORIGIN: 'https://machines.conductive.test',
    GITHUB_CLIENT_ID: 'github-client-id',
    GITHUB_CLIENT_SECRET: 'github-client-secret',
    SESSION_SIGNING_KEY: btoa('s'.repeat(32)),
    BOAT_API_KEY: 'boat-first',
    BOAT_ORG_ID: 'app-org',
    BOAT_KEY_ENCRYPTION_KEY: btoa('e'.repeat(32)),
  }
  const native = await createNativeRuntime(variables, (request) =>
    send(request),
  )
  const db = native.bindings.DB
  const attachments = native.bindings.CHAT_ATTACHMENTS
  await applyMigrations(db)
  const env: AppEnv = {
    DB: db,
    CHAT_ATTACHMENTS: attachments,
    ...variables,
  }
  let now = TEST_TIME
  let sequence = 0
  const randomToken = () => `test-${++sequence}`.padEnd(43, 'x')
  const app = createApp({
    now: () => now,
    randomToken,
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
    native,
    reserveTokens: (count: number) =>
      Array.from({ length: count }, randomToken),
    setNativeFetch: (fetch: typeof send) => {
      send = fetch
    },
    fetch,
    request,
    beginSignIn,
    login,
    createOrg,
    reset: async () => {
      await native.reset()
      await db.batch(
        [
          'conductor_import_reservations',
          'conductor_import_cleanup',
          'chat_attachments',
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
          'routine_runs',
          'routines',
          'workspaces',
          'sections',
          'repositories',
          'settings',
          'org_images',
          'image_build_logs',
          'image_builds',
          'software_images',
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
          'UPDATE signup_settings SET paused = 0, updated_at = NULL, updated_by_user_id = NULL WHERE id = 1',
        )
        .run()
      let cursor: string | undefined
      do {
        const objects = await attachments.list({ cursor })
        if (objects.objects.length)
          await attachments.delete(objects.objects.map((object) => object.key))
        cursor = objects.truncated ? objects.cursor : undefined
      } while (cursor)
      github.reset()
      boat.reset()
      send = (request) =>
        new URL(request.url).hostname === 'boat.dev'
          ? boat.fetch(request)
          : github.fetch(request)
      now = TEST_TIME
      sequence = 0
    },
    setTime: (value: number) => {
      now = value
    },
    dispose: () => native.dispose(),
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
