import { API_PATHS } from '../../src/shared/api'
import { acceptedTermsSignInPath } from '../../src/shared/terms'
import { createApp } from '../application'
import type { AppDependencies, HttpFetch } from '../env'
import { isRecord } from '../http'
import {
  responseCookie,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { OAUTH_COOKIE, SESSION_COOKIE } from './cookies'

export function expiringGitHubReply(
  access = 'ghu_original',
  refresh = 'ghr_original',
) {
  return {
    access_token: access,
    token_type: 'bearer',
    expires_in: 120,
    refresh_token: refresh,
    refresh_token_expires_in: 15_897_600,
  }
}

export function refreshSignal() {
  let complete = () => {}
  const promise = new Promise<void>((resolve) => {
    complete = resolve
  })
  return { promise, resolve: () => complete() }
}

export class GitHubTokenTestApp {
  now = TEST_TIME
  authorizationReply: unknown = expiringGitHubReply()
  refreshReply: unknown = {
    ...expiringGitHubReply('ghu_renewed', 'ghr_renewed'),
    expires_in: 28_800,
  }
  refreshRequests: Request[] = []
  onRefresh?: (count: number) => Promise<Response | void>
  readonly dependencies: AppDependencies
  private readonly app: ReturnType<typeof createApp>
  private readonly harness: TestHarness

  constructor(harness: TestHarness) {
    this.harness = harness
    let sequence = 0
    const fetch: HttpFetch = async (request) => {
      if (new URL(request.url).hostname !== 'github.com') {
        return harness.github.fetch(request)
      }
      const value: unknown = await request.clone().json()
      if (isRecord(value) && value.grant_type === 'refresh_token') {
        this.refreshRequests.push(request.clone())
        const response = await this.onRefresh?.(this.refreshRequests.length)
        return response ?? Response.json(this.refreshReply)
      }
      return Response.json(this.authorizationReply)
    }
    this.dependencies = {
      fetch,
      now: () => this.now,
      randomToken: () => `security-${++sequence}`.padEnd(43, 'x'),
    }
    this.app = createApp(this.dependencies)
  }

  request(path: string, cookie?: string): Promise<Response> {
    return this.app.fetch(
      new Request(`${TEST_ORIGIN}${path}`, {
        headers: cookie ? { Cookie: cookie } : {},
      }),
      this.harness.env,
    )
  }

  async authorize(): Promise<Response> {
    const start = await this.request(acceptedTermsSignInPath())
    const location = start.headers.get('Location')
    if (!location) throw new Error(`Sign-in returned ${start.status}`)
    const state = new URL(location).searchParams.get('state')
    return this.request(
      `${API_PATHS.githubCallback}?state=${state}&code=good-code`,
      responseCookie(start, OAUTH_COOKIE),
    )
  }

  async signIn(): Promise<{
    userId: string
    response: Response
    session: string
  }> {
    const response = await this.authorize()
    const session = responseCookie(response, SESSION_COOKIE)
    const userId = await this.harness.env.DB.prepare(
      'SELECT id FROM users WHERE github_id = 7',
    ).first<string>('id')
    if (!userId) throw new Error('Sign-in did not save the user')
    return { userId, response, session }
  }
}
