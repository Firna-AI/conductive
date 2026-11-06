import { createHash } from 'node:crypto'

import { API_PATHS } from '../../src/shared/api'
import { responseCookie, type TestHarness } from '../test-support/harness'
import { OAUTH_COOKIE } from './cookies'
import { DESKTOP_EXCHANGE_PATH, DESKTOP_ORIGIN } from './desktop-contract'

export function desktopRequest(
  harness: TestHarness,
  path: string,
  session = '',
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Origin', DESKTOP_ORIGIN)
  if (session) headers.set('Cookie', session)
  if (init.body) headers.set('Content-Type', 'application/json')
  return harness.fetch(path, { ...init, headers })
}

export async function desktopHandoff(
  harness: TestHarness,
  verifier: string,
): Promise<Response> {
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const start = await harness.fetch(
    `${API_PATHS.githubSignIn}?desktop_challenge=${challenge}`,
  )
  const state = new URL(start.headers.get('Location') ?? '').searchParams.get(
    'state',
  )
  return harness.fetch(
    `${API_PATHS.githubCallback}?state=${state}&code=good-code`,
    {
      headers: { Cookie: responseCookie(start, OAUTH_COOKIE) },
    },
  )
}

export function exchangeHandoff(
  harness: TestHarness,
  callback: Response,
  verifier: string,
  origin = DESKTOP_ORIGIN,
): Promise<Response> {
  const token = new URLSearchParams(
    new URL(callback.headers.get('Location') ?? '').hash.slice(1),
  ).get('token')
  return harness.fetch(DESKTOP_EXCHANGE_PATH, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, verifier }),
  })
}
