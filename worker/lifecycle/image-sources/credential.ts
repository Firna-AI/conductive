import type { AppEnv } from '../../env'
import { decrypt, hash } from '../../security/crypto'
import { HttpError, privateResponse } from '../../http'
import { claimSourceGrant, sourceTokenContext } from './source-data'

/** Private lifecycle handler for the machine host's composition root. */
export const IMAGE_SOURCE_CREDENTIAL_PATH = '/internal/image-source/credential'

export async function handleImageSourceCredential(
  request: Request,
  env: AppEnv,
): Promise<Response> {
  const url = new URL(request.url)
  if (
    !env.MACHINE_ORIGIN ||
    url.origin !== env.MACHINE_ORIGIN ||
    url.protocol !== 'https:' ||
    request.headers.has('Cookie') ||
    request.headers.has('Origin')
  )
    throw new HttpError(
      403,
      'build_grant_refused',
      'The build access is not valid.',
    )
  if (
    url.pathname !== IMAGE_SOURCE_CREDENTIAL_PATH ||
    request.method !== 'POST'
  )
    throw new HttpError(404, 'not_found', 'The page is not available.')
  const authorization = request.headers.get('Authorization')
  const grant = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : ''
  const job = grant ? await claimSourceGrant(env.DB, await hash(grant)) : null
  if (!job?.tokenCiphertext)
    throw new HttpError(
      401,
      'build_grant_refused',
      'The build access is not valid.',
    )
  try {
    const token = await decrypt(
      job.tokenCiphertext,
      sourceTokenContext(job),
      env.BOAT_KEY_ENCRYPTION_KEY,
    )
    return privateResponse(
      new Response(token, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
    )
  } catch {
    throw new HttpError(
      502,
      'build_access_unavailable',
      'The build access could not load.',
    )
  }
}
