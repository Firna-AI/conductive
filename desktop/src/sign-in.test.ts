import { expect, it } from 'vitest'

import {
  DESKTOP_CALLBACK,
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
  desktopSessionCookie,
} from '../../worker/security/desktop-contract.js'
import { createSignIn, handoffToken } from './sign-in.js'
import type { DesktopCookie } from './sign-in.js'
import { INVITE_CODE_PARAMETER } from '../../src/shared/waitlist.ts'

it('exchanges a verifier-bound handoff once and saves the cookie before loading the app', async () => {
  const opened: string[] = []
  const saved: DesktopCookie[] = []
  const order: string[] = []
  const requests: Request[] = []
  let release: (response: Response) => void = () => {
    throw new Error('Exchange has not started')
  }
  const signIn = createSignIn({
    appOrigin: 'https://app.conductive.test',
    random: () => 'v'.repeat(43),
    now: () => 1_800_000_000_000,
    openExternal: async (url) => {
      opened.push(url)
    },
    exchange: (request) => {
      requests.push(request)
      return new Promise<Response>((resolve) => {
        release = resolve
      })
    },
    saveCookie: async (cookie) => {
      saved.push(cookie)
      order.push('saved')
    },
    flushCookies: async () => {
      order.push('flushed')
    },
    signedIn: async () => {
      order.push('loaded')
    },
  })
  expect(await signIn.receive(`${DESKTOP_CALLBACK}#token=body.signature`)).toBe(
    false,
  )
  await signIn.start()
  expect(opened).toHaveLength(1)
  expect(new URL(opened[0]).searchParams.get('desktop_challenge')).toHaveLength(
    43,
  )
  expect(opened[0]).not.toContain('v'.repeat(43))
  const pending = signIn.receive(`${DESKTOP_CALLBACK}#token=body.signature`)
  expect(
    await signIn.receive(`${DESKTOP_CALLBACK}#token=other.signature`),
  ).toBe(false)
  expect(requests[0].headers.get('Origin')).toBe(DESKTOP_ORIGIN)
  expect(await requests[0].json()).toEqual({
    token: 'body.signature',
    verifier: 'v'.repeat(43),
  })
  expect(order).toEqual([])
  release(
    new Response(null, {
      status: 204,
      headers: {
        'Set-Cookie': desktopSessionCookie('session.signature', 604800),
      },
    }),
  )
  expect(await pending).toBe(true)
  expect(saved).toEqual([
    {
      url: 'https://app.conductive.test',
      name: DESKTOP_SESSION_COOKIE,
      value: 'session.signature',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'no_restriction',
      expirationDate: 1_800_604_800,
    },
  ])
  expect(order).toEqual(['saved', 'flushed', 'loaded'])
  expect(await signIn.receive(`${DESKTOP_CALLBACK}#token=body.signature`)).toBe(
    false,
  )
  expect(
    handoffToken(`${DESKTOP_CALLBACK}?token=body.signature`),
  ).toBeUndefined()
})

it('keeps a join code through browser sign-in and loads its join address after the handoff', async () => {
  const opened: string[] = []
  const loaded: string[] = []
  const requests: Request[] = []
  const signIn = createSignIn({
    appOrigin: 'https://app.conductive.test',
    random: () => 'v'.repeat(43),
    openExternal: async (url) => {
      opened.push(url)
    },
    exchange: async (request) => {
      requests.push(request)
      return new Response(null, {
        status: 204,
        headers: {
          'Set-Cookie': desktopSessionCookie('session.signature', 604800),
        },
      })
    },
    saveCookie: async () => {},
    flushCookies: async () => {},
    signedIn: async (path) => {
      loaded.push(path)
    },
  })
  await signIn.start('K7QHM-3XP2R')
  expect(new URL(opened[0]).searchParams.get(INVITE_CODE_PARAMETER)).toBe(
    'K7QHM-3XP2R',
  )
  expect(await signIn.receive(`${DESKTOP_CALLBACK}#token=body.signature`)).toBe(
    true,
  )
  expect(await requests[0].json()).toEqual({
    token: 'body.signature',
    verifier: 'v'.repeat(43),
  })
  expect(loaded).toEqual(['/join/K7QHM-3XP2R'])
  await signIn.start()
  expect(new URL(opened[1]).searchParams.has(INVITE_CODE_PARAMETER)).toBe(false)
  expect(await signIn.receive(`${DESKTOP_CALLBACK}#token=next.signature`)).toBe(
    true,
  )
  expect(loaded).toEqual(['/join/K7QHM-3XP2R', '/'])
})
