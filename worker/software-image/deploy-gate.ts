import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { readJsonObject } from '../http/json-body'

const encoder = new TextEncoder()

/** HMAC verification compares fixed-size digests with a native timing-safe check. */
async function tokenMatches(token: string, expected: string): Promise<boolean> {
  const actual = await crypto.subtle.digest('SHA-256', encoder.encode(token))
  const bytes = Uint8Array.from(expected.match(/../g) ?? [], (pair) =>
    Number.parseInt(pair, 16),
  )
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(32),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, actual)
  return crypto.subtle.verify('HMAC', key, signature, bytes)
}

export async function deployTokenDigest(
  request: Request,
  env: AppEnv,
  now: number,
): Promise<string> {
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
      'deploy_refused',
      'The deploy access is not valid.',
    )
  const digest = env.CONDUCTIVE_DEPLOY_TOKEN_SHA256
  const createdAt = Date.parse(env.CF_VERSION_METADATA?.timestamp ?? '')
  if (!digest || !/^[a-f0-9]{64}$/.test(digest) || !Number.isFinite(createdAt))
    throw new HttpError(404, 'not_found', 'The page is not available.')
  if (request.method !== 'POST')
    throw new HttpError(404, 'not_found', 'The page is not available.')
  const body = await readJsonObject(request)
  if (body.tokenDigest !== digest)
    throw new HttpError(
      409,
      'deploy_version_mismatch',
      'The deploy version does not match.',
    )
  const authorization = request.headers.get('Authorization')
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : ''
  if (
    !token ||
    !(await tokenMatches(token, digest)) ||
    now > createdAt + 30 * 60 * 1000
  )
    throw new HttpError(
      401,
      'deploy_refused',
      'The deploy access is not valid.',
    )
  return digest
}
