import type { Cookie } from 'electron'
import { expect, it } from 'vitest'

import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../../worker/security/desktop-contract.js'
import { desktopCredential, deviceAccount } from './credentials.js'

const cookie: Cookie = {
  name: DESKTOP_SESSION_COOKIE,
  value: 'fixture.signature',
  domain: 'app.conductive.test',
  hostOnly: true,
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'no_restriction',
  session: false,
  expirationDate: 1_800_000_100,
}
const origin = 'https://app.conductive.test'

it('reads only one valid unexpired host-only HttpOnly desktop cookie', () => {
  expect(desktopCredential([cookie], origin, 1_800_000_000_000)).toEqual({
    value: 'fixture.signature',
    expiresAt: 1_800_000_100_000,
  })
  for (const change of [
    { httpOnly: false },
    { secure: false },
    { hostOnly: false },
    { domain: 'other.test' },
    { expirationDate: 1_800_000_000 },
    { value: 'untrusted\r\nheader' },
    { path: '/other' },
  ])
    expect(
      desktopCredential([{ ...cookie, ...change }], origin, 1_800_000_000_000),
    ).toBeUndefined()
  expect(
    desktopCredential([cookie, cookie], origin, 1_800_000_000_000),
  ).toBeUndefined()
})

it('gets the account identity from the authenticated API without a credential in its URL', async () => {
  const captured: Request[] = []
  const request: typeof fetch = async (resource, options) => {
    captured.push(new Request(resource, options))
    return Response.json({ user: { id: 'user-one' } })
  }
  expect(
    await deviceAccount(
      origin,
      cookie.value,
      new AbortController().signal,
      request,
    ),
  ).toBe('user-one')
  expect(captured[0].url).toBe(origin + '/api/session')
  expect(captured[0].headers.get('Origin')).toBe(DESKTOP_ORIGIN)
  expect(captured[0].headers.get('Cookie')).toBe(
    `${DESKTOP_SESSION_COOKIE}=fixture.signature`,
  )
  expect(captured[0].redirect).toBe('error')
  expect(
    await deviceAccount(
      origin,
      cookie.value,
      new AbortController().signal,
      async () => new Response(null, { status: 401 }),
    ),
  ).toBeUndefined()
  await expect(
    deviceAccount(
      origin,
      cookie.value,
      new AbortController().signal,
      async () => new Response(null, { status: 503 }),
    ),
  ).rejects.toThrow('The desktop session could not be checked')
})
