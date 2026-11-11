import { linkWorkerError } from '../error-reporting/causes'
import { productName } from '../../docs/mockups/src/brand'
import type { GitHubIdentity } from '../data/users'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError, isRecord } from '../http'
import { parseGitHubTokens, type GitHubTokenBundle } from './github-token-data'

const SIGN_IN_FAILED = 'GitHub sign-in failed. Start sign-in again.'

interface AuthorizedGitHubIdentity extends GitHubIdentity {
  verifiedEmails: readonly string[]
}

export class GitHubClient {
  private readonly fetch: HttpFetch

  constructor(fetch: HttpFetch) {
    this.fetch = fetch
  }

  async authorize(
    code: string,
    verifier: string,
    env: AppEnv,
  ): Promise<AuthorizedGitHubIdentity> {
    return (await this.authorizeWithTokens(code, verifier, env)).profile
  }

  async authorizeWithTokens(
    code: string,
    verifier: string,
    env: AppEnv,
    now = Date.now(),
  ): Promise<{ profile: AuthorizedGitHubIdentity; tokens: GitHubTokenBundle }> {
    const value = await this.request(
      new Request('https://github.com/login/oauth/access_token', {
        method: 'POST',
        redirect: 'manual',
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
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': productName,
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
        githubCreatedAt:
          typeof profile.created_at === 'string' &&
          Number.isFinite(Date.parse(profile.created_at))
            ? Date.parse(profile.created_at)
            : null,
        ...(await this.verifiedEmails(tokens.accessToken)),
      },
      tokens,
    }
  }

  private async verifiedEmails(accessToken: string): Promise<{
    verifiedEmails: readonly string[]
    primaryVerifiedEmail: string | null
  }> {
    const emails = new Set<string>()
    let primaryVerifiedEmail: string | null = null
    let next = true
    for (let page = 1; next; page++) {
      const response = await this.response(
        new Request(
          `https://api.github.com/user/emails?per_page=100&page=${page}`,
          {
            redirect: 'manual',
            signal: AbortSignal.timeout(30_000),
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': productName,
              'X-GitHub-Api-Version': '2022-11-28',
            },
          },
        ),
      )
      const values = await this.json(response)
      if (!Array.isArray(values)) throw signInFailed()
      for (const value of values) {
        if (
          !isRecord(value) ||
          typeof value.email !== 'string' ||
          !value.email ||
          typeof value.verified !== 'boolean'
        )
          throw signInFailed()
        if (value.verified) {
          const email = value.email.toLowerCase()
          emails.add(email)
          if (value.primary === true) primaryVerifiedEmail = email
        }
      }
      next = /\brel="next"/.test(response.headers.get('Link') ?? '')
    }
    return { verifiedEmails: [...emails], primaryVerifiedEmail }
  }

  private async request(request: Request): Promise<unknown> {
    return this.json(await this.response(request))
  }

  private async response(request: Request): Promise<Response> {
    try {
      const response = await this.fetch(request)
      if (!response.ok) throw new Error('GitHub refused the request')
      return response
    } catch (error) {
      throw linkWorkerError(signInFailed(), error)
    }
  }

  private async json(response: Response): Promise<unknown> {
    try {
      return await response.json()
    } catch (error) {
      throw linkWorkerError(signInFailed(), error)
    }
  }
}

function signInFailed() {
  return new HttpError(502, 'github_sign_in_failed', SIGN_IN_FAILED)
}
