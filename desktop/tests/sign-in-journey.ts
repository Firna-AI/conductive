import { expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

import { API_PATHS } from '../../src/shared/api.js'
import {
  DESKTOP_CALLBACK,
  DESKTOP_EXCHANGE_PATH,
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
  desktopSessionCookie,
} from '../../worker/security/desktop-contract.js'

/** A stand-in HTTP boundary reads Chromium's real outgoing credentials. */
export async function sessionEndpoint(page: Page, appOrigin: string) {
  const requests: { origin: string | undefined; credentialPresent: boolean }[] =
    []
  await page.route(appOrigin + API_PATHS.session, async (route) => {
    const headers = await route.request().allHeaders()
    const credentialPresent =
      headers.cookie === `${DESKTOP_SESSION_COOKIE}=session.signature`
    requests.push({ origin: headers.origin, credentialPresent })
    await route.fulfill({
      status: credentialPresent ? 200 : 401,
      headers: {
        'Access-Control-Allow-Origin': DESKTOP_ORIGIN,
        'Access-Control-Allow-Credentials': 'true',
        Vary: 'Origin',
      },
      json: { signedIn: credentialPresent },
    })
  })
  return async (signedIn: boolean) => {
    // The minimal page has no session UI yet. Use its real credentialed fetch.
    const result = await page.evaluate(async (url) => {
      const response = await fetch(url, { credentials: 'include' })
      const body: unknown = await response.json()
      return { status: response.status, body }
    }, appOrigin + API_PATHS.session)
    expect(result).toEqual({
      status: signedIn ? 200 : 401,
      body: { signedIn },
    })
    const outgoing = requests.at(-1)
    expect(outgoing).toEqual({
      origin: DESKTOP_ORIGIN,
      credentialPresent: signedIn,
    })
    return { response: result, outgoing }
  }
}

export async function signInThroughMain(
  electron: ElectronApplication,
  appOrigin: string,
): Promise<void> {
  await electron.evaluate(
    ({ app, BrowserWindow, Menu, shell }, input) => {
      const { createHash } = process.getBuiltinModule('node:crypto')
      let challenge: string | null = null
      shell.openExternal = async (address) => {
        const url = new URL(address)
        if (url.origin !== input.appOrigin || url.pathname !== input.signInPath)
          throw new Error('Unexpected sign-in browser destination')
        challenge = url.searchParams.get('desktop_challenge')
      }
      const original = globalThis.fetch
      globalThis.fetch = async (resource, init) => {
        const request =
          resource instanceof Request ? resource : new Request(resource, init)
        if (request.url !== input.appOrigin + input.exchangePath)
          return original(resource, init)
        const body: unknown = await request.json()
        if (
          !body ||
          typeof body !== 'object' ||
          !('verifier' in body) ||
          typeof body.verifier !== 'string' ||
          !('token' in body) ||
          body.token !== 'body.signature' ||
          createHash('sha256').update(body.verifier).digest('base64url') !==
            challenge ||
          request.method !== 'POST' ||
          request.headers.get('Origin') !== input.desktopOrigin
        )
          throw new Error('The main process did not send its sign-in proof')
        return new Response(null, {
          status: 204,
          headers: { 'Set-Cookie': input.cookie },
        })
      }
      const item = Menu.getApplicationMenu()
        ?.items.flatMap((entry) => entry.submenu?.items ?? [])
        .find((entry) => entry.label === 'Sign in with GitHub')
      if (!item) throw new Error('The native sign-in menu is missing')
      item.click(item, BrowserWindow.getAllWindows()[0], {})
      if (!challenge) throw new Error('The native menu did not start sign-in')
      app.emit(
        'open-url',
        { preventDefault() {} },
        `${input.callback}#token=body.signature`,
      )
    },
    {
      appOrigin,
      signInPath: API_PATHS.githubSignIn,
      exchangePath: DESKTOP_EXCHANGE_PATH,
      callback: DESKTOP_CALLBACK,
      desktopOrigin: DESKTOP_ORIGIN,
      cookie: desktopSessionCookie('session.signature', 604800),
    },
  )
}

export async function storedSessionCookie(
  electron: ElectronApplication,
  appOrigin: string,
) {
  const cookies = await electron.evaluate(
    async ({ BrowserWindow }, input) =>
      (
        await BrowserWindow.getAllWindows()[0].webContents.session.cookies.get({
          url: input.appOrigin,
          name: input.name,
        })
      ).map((cookie) => ({
        name: cookie.name,
        domain: cookie.domain,
        path: cookie.path,
        hostOnly: cookie.hostOnly,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        session: cookie.session,
      })),
    { appOrigin, name: DESKTOP_SESSION_COOKIE },
  )
  expect(cookies).toEqual([
    {
      name: DESKTOP_SESSION_COOKIE,
      domain: new URL(appOrigin).hostname,
      path: '/',
      hostOnly: true,
      httpOnly: true,
      secure: true,
      sameSite: 'no_restriction',
      session: false,
    },
  ])
  return cookies
}
