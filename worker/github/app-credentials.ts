import type { HttpFetch } from '../env'
import { base64Url } from '../security/crypto'
import { githubFailure, object, text } from './parsers'
import { appSigningKey } from './private-key'
import { githubJson, githubRequest } from './transport'

interface GitHubAppIdentity {
  clientId: string
  privateKey: string | CryptoKey
}

interface InstallationAccess {
  installationId: number
  repositoryIds: readonly number[]
  permissions: Readonly<Record<string, 'read'>>
}

interface CredentialDependencies {
  fetch: HttpFetch
  now: () => number
  failure: () => Error
}

let imported: { pem: string; key: Promise<CryptoKey> } | undefined

function signingKey(privateKey: string | CryptoKey): Promise<CryptoKey> {
  if (typeof privateKey !== 'string') return Promise.resolve(privateKey)
  if (imported?.pem !== privateKey)
    imported = { pem: privateKey, key: appSigningKey(privateKey) }
  return imported.key
}

/** One PEM cache entry serves all features. A failed mint clears that entry. */
export async function installationAccessToken(
  identity: GitHubAppIdentity,
  access: InstallationAccess,
  dependencies: CredentialDependencies,
): Promise<string> {
  try {
    const key = signingKey(identity.privateKey)
    const seconds = Math.floor(dependencies.now() / 1000)
    const encode = (value: unknown) =>
      base64Url(new TextEncoder().encode(JSON.stringify(value)))
    const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
      iat: seconds - 60,
      exp: seconds + 540,
      iss: identity.clientId,
    })}`
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      await key,
      new TextEncoder().encode(body),
    )
    const jwt = `${body}.${base64Url(new Uint8Array(signature))}`
    const result = object(
      await githubJson(
        dependencies.fetch,
        githubRequest(
          `/app/installations/${access.installationId}/access_tokens`,
          jwt,
          {
            method: 'POST',
            body: JSON.stringify({
              repository_ids: access.repositoryIds,
              permissions: access.permissions,
            }),
          },
        ),
      ),
    )
    const token = text(result.token)
    if (!token) throw githubFailure()
    return token
  } catch {
    if (imported?.pem === identity.privateKey) imported = undefined
    throw dependencies.failure()
  }
}

/** Only an inactive-token response releases the caller's revocation ownership. */
export async function revokeInstallationAccessToken(
  fetch: HttpFetch,
  token: string,
  failure: () => Error,
): Promise<void> {
  try {
    const response = await fetch(
      githubRequest('/installation/token', token, { method: 'DELETE' }),
    )
    await response.body?.cancel()
    if (response.status !== 204 && response.status !== 401) throw failure()
  } catch {
    throw failure()
  }
}
