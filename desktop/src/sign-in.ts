import { createHash, randomBytes } from 'node:crypto'

import {
  DESKTOP_CALLBACK,
  DESKTOP_EXCHANGE_PATH,
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../worker/security/desktop-contract.js'

export interface DesktopCookie {
  url: string
  name: string
  value: string
  path: string
  secure: boolean
  httpOnly: boolean
  sameSite: 'no_restriction'
  expirationDate: number
}

export function handoffToken(address: string): string | undefined {
  return new RegExp(
    `^${DESKTOP_CALLBACK}#token=([A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)$`,
  ).exec(address)?.[1]
}

export interface SignInDependencies {
  appOrigin: string
  openExternal(url: string): Promise<unknown>
  exchange(request: Request): Promise<Response>
  saveCookie(cookie: DesktopCookie): Promise<void>
  flushCookies(): Promise<void>
  signedIn(): Promise<unknown>
  random?(): string
  now?(): number
}

/** The verifier and the session cookie stay in the main process. */
export function createSignIn(dependencies: SignInDependencies) {
  let verifier: string | undefined
  let exchanging = false
  return {
    async start(): Promise<void> {
      if (exchanging) return
      verifier =
        dependencies.random?.() ?? randomBytes(32).toString('base64url')
      const challenge = createHash('sha256')
        .update(verifier)
        .digest('base64url')
      const url = new URL('/api/auth/github', dependencies.appOrigin)
      url.searchParams.set('desktop_challenge', challenge)
      await dependencies.openExternal(url.href)
    },
    async receive(address: string): Promise<boolean> {
      const token = handoffToken(address)
      if (!token || !verifier || exchanging) return false
      exchanging = true
      const proof = verifier
      try {
        const response = await dependencies.exchange(
          new Request(dependencies.appOrigin + DESKTOP_EXCHANGE_PATH, {
            method: 'POST',
            redirect: 'error',
            headers: {
              Origin: DESKTOP_ORIGIN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, verifier: proof }),
          }),
        )
        if (response.status !== 204) throw new Error('Desktop sign-in failed')
        const values = response.headers
          .getSetCookie()
          .filter((cookie) => cookie.startsWith(`${DESKTOP_SESSION_COOKIE}=`))
        if (values.length !== 1)
          throw new Error('Desktop session cookie is missing')
        const cookie = values[0]
        const value = cookie
          .slice(DESKTOP_SESSION_COOKIE.length + 1)
          .split(';')[0]
        const seconds = /(?:^|;\s*)Max-Age=(\d+)(?:;|$)/i.exec(cookie)?.[1]
        if (
          !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) ||
          !seconds ||
          !/;\s*HttpOnly(?:;|$)/i.test(cookie) ||
          !/;\s*Secure(?:;|$)/i.test(cookie) ||
          !/;\s*SameSite=None(?:;|$)/i.test(cookie)
        )
          throw new Error('Invalid desktop session cookie')
        await dependencies.saveCookie({
          url: dependencies.appOrigin,
          name: DESKTOP_SESSION_COOKIE,
          value,
          path: '/',
          secure: true,
          httpOnly: true,
          sameSite: 'no_restriction',
          expirationDate:
            (dependencies.now?.() ?? Date.now()) / 1000 + Number(seconds),
        })
        await dependencies.flushCookies()
        verifier = undefined
        await dependencies.signedIn()
        return true
      } finally {
        exchanging = false
      }
    },
  }
}
