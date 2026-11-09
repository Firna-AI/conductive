import type { Cookie } from 'electron'

import { API_PATHS } from '../../../src/shared/api.ts'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../../worker/security/desktop-contract.js'
import type { DeviceAccount, DeviceCredential } from './connection.js'

/** Read only the real host cookie. A renderer cannot supply a credential. */
export function desktopCredential(
  cookies: readonly Cookie[],
  appOrigin: string,
  now: number,
): DeviceCredential | undefined {
  const matching = cookies.filter(
    (cookie) =>
      cookie.name === DESKTOP_SESSION_COOKIE &&
      cookie.hostOnly &&
      cookie.domain === new URL(appOrigin).hostname &&
      cookie.path === '/' &&
      cookie.httpOnly &&
      cookie.secure &&
      cookie.sameSite === 'no_restriction' &&
      cookie.expirationDate !== undefined &&
      cookie.expirationDate * 1000 > now &&
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cookie.value),
  )
  if (matching.length !== 1) return
  const cookie = matching[0]
  return { value: cookie.value, expiresAt: (cookie.expirationDate ?? 0) * 1000 }
}

/** A signed-in account key comes from the authenticated API, never a token decode. */
export async function deviceAccount(
  appOrigin: string,
  credential: string,
  signal: AbortSignal,
  request = fetch,
): Promise<DeviceAccount | undefined> {
  const response = await request(
    new Request(new URL(API_PATHS.session, appOrigin), {
      headers: {
        Origin: DESKTOP_ORIGIN,
        Cookie: `${DESKTOP_SESSION_COOKIE}=${credential}`,
      },
      redirect: 'error',
      signal,
    }),
  )
  if (response.status === 401 || response.status === 403) return
  if (response.status !== 200)
    throw new Error('The desktop session could not be checked')
  const value: unknown = await response.json()
  if (
    typeof value === 'object' &&
    value !== null &&
    'appAccess' in value &&
    typeof value.appAccess === 'boolean' &&
    'user' in value &&
    typeof value.user === 'object' &&
    value.user !== null &&
    'id' in value.user &&
    typeof value.user.id === 'string' &&
    value.user.id.length > 0
  )
    return { userId: value.user.id, appAccess: value.appAccess }
}
