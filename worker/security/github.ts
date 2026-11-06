import type { GitHubIdentity } from '../data/users'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError, isRecord } from '../http'
import { parseGitHubTokens, type GitHubTokenBundle } from './github-token-data'

const SIGN_IN_FAILED = 'GitHub sign-in failed. Start sign-in again.'

export class GitHubClient {
  private readonly fetch: HttpFetch

  constructor(fetch: HttpFetch) {
    this.fetch = fetch
  }

  async authorize(
    code: string,
    verifier: string,
    env: AppEnv,
  ): Promise<GitHubIdentity> {
    return (await this.authorizeWithTokens(code, verifier, env)).profile
  }

  async authorizeWithTokens(
    code: string,
    verifier: string,
    env: AppEnv,
    now = Date.now(),
  ): Promise<{ profile: GitHubIdentity; tokens: GitHubTokenBundle }> {
    const value = await this.request(
      new Request('https://github.com/login/oauth/access_token', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          code_verifier: verifier,
          redirect_uri: `${env.APP_ORIGIN}/api/auth/github/callback`,
        }),
      }),
    )
    const tokens = parseGitHubTokens(value, now)
    if (!tokens) {
      throw new HttpError(502, 'github_sign_in_failed', SIGN_IN_FAILED)
    }
    const profile = await this.request(
      new Request('https://api.github.com/user', {
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Conducting',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }),
    )
    if (
      !isRecord(profile) ||
      typeof profile.id !== 'number' ||
      !Number.isSafeInteger(profile.id) ||
      profile.id <= 0 ||
      typeof profile.login !== 'string' ||
      !profile.login
    ) {
      throw new HttpError(502, 'github_sign_in_failed', SIGN_IN_FAILED)
    }
    return {
      profile: {
        githubId: profile.id,
        githubLogin: profile.login,
        displayName: typeof profile.name === 'string' ? profile.name : null,
        avatarUrl:
          typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
      },
      tokens,
    }
  }

  private async request(request: Request): Promise<unknown> {
    try {
      const response = await this.fetch(request)
      if (!response.ok) throw new Error('GitHub refused the request')
      return await response.json()
    } catch {
      throw new HttpError(502, 'github_sign_in_failed', SIGN_IN_FAILED)
    }
  }
}
