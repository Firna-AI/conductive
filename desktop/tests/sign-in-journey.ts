import { expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

import { API_PATHS } from '../../src/shared/api.js'
import { FakeApiServer } from '../../src/test-support/fake-api'
import {
  DESKTOP_CALLBACK,
  DESKTOP_EXCHANGE_PATH,
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
  desktopSessionCookie,
} from '../../worker/security/desktop-contract.js'

/** The real shell reads a fake Worker over Chromium's actual credentialed transport. */
export async function sessionEndpoint(page: Page, appOrigin: string) {
  const server = new FakeApiServer()
  const requests: {
    origin: string | undefined
    credentialPresent: boolean
    status: number
    body: unknown
  }[] = []
  const cors = {
    'Access-Control-Allow-Origin': DESKTOP_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
  await page.context().route(appOrigin + '/api/**', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors })
      return
    }
    const headers = await request.allHeaders()
    const credentialPresent =
      headers.cookie === `${DESKTOP_SESSION_COOKIE}=session.signature`
    const response = credentialPresent
      ? await server.fetch(request.url(), {
          method: request.method(),
          headers,
          body: request.postData() ?? undefined,
        })
      : Response.json(
          {
            error: {
              code: 'sign_in_required',
              message: 'Sign in to continue.',
            },
          },
          { status: 401 },
        )
    const body = await response.text()
    if (new URL(request.url()).pathname === API_PATHS.session) {
      const value: unknown = JSON.parse(body)
      requests.push({
        origin: headers.origin,
        credentialPresent,
        status: response.status,
        body: value,
      })
    }
    await route.fulfill({
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...cors },
      body,
    })
  })
  return async (signedIn: boolean) => {
    const before = requests.length
    await page.reload()
    await expect.poll(() => requests.length).toBeGreaterThan(before)
    const outgoing = requests.at(-1)
    expect(outgoing?.origin).toBe(DESKTOP_ORIGIN)
    expect(outgoing?.credentialPresent).toBe(signedIn)
    expect(outgoing?.status).toBe(signedIn ? 200 : 401)
    if (signedIn)
      await page.getByRole('link', { name: 'Account', exact: true }).waitFor()
    else
      await page
        .getByRole('heading', { name: 'Sign in to Conducting', exact: true })
        .waitFor()
    return {
      response: { status: outgoing?.status, body: outgoing?.body },
      outgoing: {
        origin: outgoing?.origin,
        credentialPresent: outgoing?.credentialPresent,
      },
    }
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
