import type { HttpFetch } from '../../env'
import { isRecord } from '../../http'
import { base64Url } from '../../security/crypto'
import type { SourceRepository } from './data'

export async function installationToken(
  fetch: HttpFetch,
  clientId: string,
  key: CryptoKey,
  repository: SourceRepository,
): Promise<string> {
  const encoder = new TextEncoder()
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(
    encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
  )
  const claims = base64Url(
    encoder.encode(
      JSON.stringify({
        iat: now - 60,
        exp: now + 540,
        iss: clientId,
      }),
    ),
  )
  const body = `${header}.${claims}`
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(body),
  )
  const response = await fetch(
    new Request(
      `https://api.github.com/app/installations/${repository.installationId}/access_tokens`,
      {
        method: 'POST',
        redirect: 'manual',
        headers: {
          Authorization: `Bearer ${body}.${base64Url(new Uint8Array(signature))}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2026-03-10',
          'User-Agent': 'Conductive',
        },
        body: JSON.stringify({
          repository_ids: [repository.githubRepositoryId],
          permissions: { contents: 'read' },
        }),
      },
    ),
  )
  if (response.status !== 201) {
    await response.body?.cancel()
    throw new Error('Installation access is not available')
  }
  const value: unknown = await response.json()
  if (!isRecord(value) || typeof value.token !== 'string' || !value.token) {
    throw new Error('Installation access is not available')
  }
  return value.token
}

/** GitHub uses 401 for invalid credentials. Other failures retain revocation ownership. */
export async function revokeInstallationToken(
  fetch: HttpFetch,
  token: string,
): Promise<void> {
  const response = await fetch(
    new Request('https://api.github.com/installation/token', {
      method: 'DELETE',
      redirect: 'manual',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'Conductive',
      },
    }),
  )
  await response.body?.cancel()
  if (response.status !== 204 && response.status !== 401)
    throw new Error('Installation access could not be revoked')
}
