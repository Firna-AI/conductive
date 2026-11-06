import type { AppEnv } from '../env'
import { isRecord } from '../http'
import { readCookie } from '../security/cookies'
import { decrypt, encrypt } from '../security/crypto'
import type { PreviewRecord } from './store'

export const PREVIEW_COOKIE_PREFIX = '__Secure-conducting-preview-'
const launchLifetime = 60_000
type Purpose = 'launch' | 'cookie'

function context(env: AppEnv, row: PreviewRecord, purpose: Purpose): string {
  return `conducting:preview:${purpose}:${env.APP_ORIGIN}:${row.hostname}:${row.id}`
}

async function issue(
  env: AppEnv,
  row: PreviewRecord,
  purpose: Purpose,
  expiresAt: number,
): Promise<string> {
  return encrypt(
    JSON.stringify({ expiresAt }),
    context(env, row, purpose),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
}

async function valid(
  token: string | null,
  env: AppEnv,
  row: PreviewRecord,
  purpose: Purpose,
  now: number,
): Promise<boolean> {
  if (!token) return false
  try {
    const value: unknown = JSON.parse(
      await decrypt(
        token,
        context(env, row, purpose),
        env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    )
    return (
      isRecord(value) &&
      typeof value.expiresAt === 'number' &&
      value.expiresAt > now &&
      value.expiresAt <= row.expiresAt
    )
  } catch {
    return false
  }
}

export function launchGrant(env: AppEnv, row: PreviewRecord, now: number) {
  return issue(
    env,
    row,
    'launch',
    Math.min(row.expiresAt, now + launchLifetime),
  )
}

export function launchGranted(
  token: string | null,
  env: AppEnv,
  row: PreviewRecord,
  now: number,
) {
  return valid(token, env, row, 'launch', now)
}

export function previewAuthorized(
  request: Request,
  env: AppEnv,
  row: PreviewRecord,
  now: number,
) {
  return valid(
    readCookie(request, `${PREVIEW_COOKIE_PREFIX}${row.id}`),
    env,
    row,
    'cookie',
    now,
  )
}

export async function previewCookie(
  env: AppEnv,
  row: PreviewRecord,
  now: number,
) {
  const token = await issue(env, row, 'cookie', row.expiresAt)
  const maxAge = Math.max(0, Math.floor((row.expiresAt - now) / 1000))
  return `${PREVIEW_COOKIE_PREFIX}${row.id}=${token}; Domain=${env.PREVIEW_DOMAIN?.toLowerCase()}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${maxAge}`
}
