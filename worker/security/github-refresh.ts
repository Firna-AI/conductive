import { linkWorkerError } from '../error-reporting/causes'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { parseGitHubTokens, type GitHubTokenBundle } from './github-token-data'

export async function refreshGitHubTokens(
  env: AppEnv,
  refreshToken: string,
  dependencies: Pick<AppDependencies, 'fetch' | 'now'>,
): Promise<GitHubTokenBundle> {
  const now = dependencies.now()
  try {
    const response = await dependencies.fetch(
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
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      }),
    )
    if (!response.ok) throw new Error('GitHub refused the refresh')
    const value: unknown = await response.json()
    const tokens = parseGitHubTokens(value, now)
    if (!tokens) throw new Error('GitHub returned an invalid token')
    return tokens
  } catch (error) {
    throw linkWorkerError(
      new HttpError(
        502,
        'github_refresh_failed',
        'GitHub access failed. Sign in with GitHub again.',
      ),
      error,
    )
  }
}
