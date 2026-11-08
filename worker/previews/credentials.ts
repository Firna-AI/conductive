import { saveOAuthState, takeOAuthState } from '../data/users'
import type { AppEnv } from '../env'
import { isRecord } from '../http'
import type { PreviewConnectionIdentity } from '../security/connection-access'
import { readCookie } from '../security/cookies'
import { decrypt, encrypt, hash } from '../security/crypto'
import type { PreviewRecord } from './store'
import { readPreviewAccess } from './viewer-access'

export const PREVIEW_COOKIE_PREFIX = '__Secure-conductive-preview-'
const launchLifetime = 60_000
type Purpose = 'launch' | 'cookie'

export interface PreviewViewer {
  sessionId: string
  userId: string
}

function context(
  env: AppEnv,
  hostname: string,
  id: string,
  purpose: Purpose,
): string {
  return `conductive:preview:${purpose}:${env.APP_ORIGIN}:${hostname}:${id}`
}

async function issue(
  env: AppEnv,
  identity: PreviewConnectionIdentity,
  purpose: Purpose,
): Promise<string> {
  const ciphertext = await encrypt(
    JSON.stringify(identity),
    context(env, identity.hostname, identity.previewId, purpose),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  return `${identity.previewId}.${ciphertext}`
}

async function credentialIdentity(
  token: string | null,
  env: AppEnv,
  hostname: string,
  purpose: Purpose,
  now: number,
): Promise<PreviewConnectionIdentity | null> {
  if (!token) return null
  const separator = token.indexOf('.')
  if (separator < 1) return null
  const previewId = token.slice(0, separator)
  try {
    const value: unknown = JSON.parse(
      await decrypt(
        token.slice(separator + 1),
        context(env, hostname, previewId, purpose),
        env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    )
    if (
      !isRecord(value) ||
      value.kind !== 'preview' ||
      value.previewId !== previewId ||
      value.hostname !== hostname ||
      typeof value.sessionId !== 'string' ||
      typeof value.userId !== 'string' ||
      typeof value.orgId !== 'string' ||
      typeof value.workspaceId !== 'string' ||
      typeof value.expiresAt !== 'number' ||
      value.expiresAt <= now
    )
      return null
    return {
      kind: 'preview',
      previewId,
      hostname,
      sessionId: value.sessionId,
      userId: value.userId,
      orgId: value.orgId,
      workspaceId: value.workspaceId,
      expiresAt: value.expiresAt,
    }
  } catch {
    return null
  }
}

export async function launchGrant(
  env: AppEnv,
  row: PreviewRecord,
  viewer: PreviewViewer,
  now: number,
) {
  const expiresAt = Math.min(row.expiresAt, now + launchLifetime)
  const token = await issue(
    env,
    {
      kind: 'preview',
      ...viewer,
      orgId: row.orgId,
      workspaceId: row.workspaceId,
      previewId: row.id,
      hostname: row.hostname,
      expiresAt,
    },
    'launch',
  )
  await saveOAuthState(env.DB, await hash(`preview:${token}`), expiresAt, now)
  return { token, expiresAt }
}

export async function redeemLaunchGrant(
  token: string | null,
  env: AppEnv,
  hostname: string,
  now: number,
): Promise<{ row: PreviewRecord; cookie: string } | null> {
  const identity = await credentialIdentity(token, env, hostname, 'launch', now)
  if (!identity || !token) return null
  const row = await readPreviewAccess(env, identity, now)
  if (
    !row ||
    !(await takeOAuthState(env.DB, await hash(`preview:${token}`), now))
  )
    return null
  const credential = await issue(
    env,
    { ...identity, expiresAt: row.expiresAt },
    'cookie',
  )
  const maxAge = Math.max(0, Math.floor((row.expiresAt - now) / 1000))
  return {
    row,
    cookie: `${PREVIEW_COOKIE_PREFIX}${row.id}=${credential}; Domain=${env.PREVIEW_DOMAIN?.toLowerCase()}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${maxAge}`,
  }
}

export async function previewIdentity(
  request: Request,
  env: AppEnv,
  hostname: string,
  now: number,
): Promise<PreviewConnectionIdentity | null> {
  const names = new Set(
    (request.headers.get('Cookie') ?? '')
      .split(';')
      .map((part) => part.trim().split('=')[0])
      .filter((name) => name.startsWith(PREVIEW_COOKIE_PREFIX)),
  )
  for (const name of names) {
    const identity = await credentialIdentity(
      readCookie(request, name),
      env,
      hostname,
      'cookie',
      now,
    )
    if (identity && name === `${PREVIEW_COOKIE_PREFIX}${identity.previewId}`)
      return identity
  }
  return null
}
