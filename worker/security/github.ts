import { productName } from '../../docs/mockups/src/brand'
import type { GitHubIdentity } from '../data/users'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError, isRecord } from '../http'

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
    const token = await this.request(
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
    if (
      !isRecord(token) ||
      typeof token.access_token !== 'string' ||
      !token.access_token
    ) {
      throw new HttpError(502, 'github_sign_in_failed', SIGN_IN_FAILED)
    }
    const profile = await this.request(
      new Request('https://api.github.com/user', {
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${token.access_token}`,
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
      githubId: profile.id,
      githubLogin: profile.login,
      displayName: typeof profile.name === 'string' ? profile.name : null,
      avatarUrl:
        typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
      verifiedEmails: await this.verifiedEmails(token.access_token),
    }
  }

  private async verifiedEmails(
    accessToken: string,
  ): Promise<readonly string[]> {
    const emails = new Set<string>()
    let next = true
    for (let page = 1; next; page++) {
      const response = await this.response(
        new Request(
          `https://api.github.com/user/emails?per_page=100&page=${page}`,
          {
            redirect: 'error',
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
        if (value.verified) emails.add(value.email.toLowerCase())
      }
      next = /\brel="next"/.test(response.headers.get('Link') ?? '')
    }
    return [...emails]
  }

  private async request(request: Request): Promise<unknown> {
    return this.json(await this.response(request))
  }

  private async response(request: Request): Promise<Response> {
    try {
      const response = await this.fetch(request)
      if (!response.ok) throw new Error('GitHub refused the request')
      return response
    } catch {
      throw signInFailed()
    }
  }

  private async json(response: Response): Promise<unknown> {
    try {
      return await response.json()
    } catch {
      throw signInFailed()
    }
  }
}

function signInFailed() {
  return new HttpError(502, 'github_sign_in_failed', SIGN_IN_FAILED)
}
