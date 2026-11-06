import type { AppEnv, HttpFetch } from '../env'
import { base64Url } from '../security/crypto'
import type { GitHubTokenProvider } from './contracts'
import { githubFailure, object, text } from './parsers'
import { githubJson, githubRequest } from './transport'

export interface GitHubAppCredentials extends Pick<AppEnv, 'GITHUB_CLIENT_ID'> {
  /** PKCS#8 PEM. This secret stays in the Worker and never reaches a sandbox. */
  GITHUB_APP_PRIVATE_KEY: string
}

/** Narrow installation tokens for server-side reads. No git credential route. */
export function installationTokenProvider(
  env: GitHubAppCredentials,
  fetch: HttpFetch,
  now: () => number,
): GitHubTokenProvider {
  let privateKey: Promise<CryptoKey> | undefined
  return async (workspace) => {
    try {
      privateKey ??= importKey(env.GITHUB_APP_PRIVATE_KEY)
      const seconds = Math.floor(now() / 1000)
      const encode = (value: unknown) =>
        base64Url(new TextEncoder().encode(JSON.stringify(value)))
      const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
        iat: seconds - 60,
        exp: seconds + 540,
        iss: env.GITHUB_CLIENT_ID,
      })}`
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        await privateKey,
        new TextEncoder().encode(body),
      )
      const jwt = `${body}.${base64Url(new Uint8Array(signature))}`
      const result = object(
        await githubJson(
          fetch,
          githubRequest(
            `/app/installations/${workspace.installationId}/access_tokens`,
            jwt,
            {
              method: 'POST',
              body: JSON.stringify({
                repository_ids: [workspace.repositoryId],
                permissions: {
                  contents: 'read',
                  pull_requests: 'read',
                  checks: 'read',
                  statuses: 'read',
                },
              }),
            },
          ),
        ),
      )
      const token = text(result.token)
      if (!token) throw githubFailure()
      return token
    } catch {
      privateKey = undefined
      throw githubFailure()
    }
  }
}

async function importKey(pem: string): Promise<CryptoKey> {
  const encoded = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const bytes = Uint8Array.from(atob(encoded), (character) =>
    character.charCodeAt(0),
  )
  return crypto.subtle.importKey(
    'pkcs8',
    bytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}
