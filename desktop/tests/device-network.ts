import type { ClientRequest, IncomingMessage, RequestOptions } from 'node:http'
import { expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

import { API_PATHS } from '../../src/shared/api.ts'
import { deviceConnectionPath } from '../../src/shared/device.ts'
import { FakeApiServer } from '../../src/test-support/fake-api.js'
import { fakeUser } from '../../src/test-support/fixtures/core.js'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../worker/security/desktop-contract.js'

/** Serve the bundled product through HTTP, including notification-created windows. */
export async function deviceSessionEndpoint(page: Page, appOrigin: string) {
  const server = new FakeApiServer()
  const signedOut = {
    error: { code: 'unauthorized', message: 'Sign in to continue.' },
  }
  const requests: { origin: string | undefined; credentialPresent: boolean }[] =
    []
  await page.context().route(appOrigin + '/api/**', async (route) => {
    const request = route.request()
    const headers = await request.allHeaders()
    const credentialPresent =
      headers.cookie === `${DESKTOP_SESSION_COOKIE}=session.signature`
    const cors = {
      'Access-Control-Allow-Origin': DESKTOP_ORIGIN,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
      Vary: 'Origin',
    }
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors })
      return
    }
    if (new URL(request.url()).pathname === API_PATHS.session)
      requests.push({ origin: headers.origin, credentialPresent })
    const response = credentialPresent
      ? await server.fetch(
          new Request(request.url(), {
            method: request.method(),
            headers,
            body: request.postData(),
          }),
        )
      : Response.json(signedOut, { status: 401 })
    await route.fulfill({
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...cors },
      body: await response.text(),
    })
  })
  return async (signedIn: boolean) => {
    // Read Chromium's outgoing credentials without replacing renderer fetch.
    const result = await page.evaluate(async (url) => {
      const response = await fetch(url, { credentials: 'include' })
      const body: unknown = await response.json()
      return { status: response.status, body }
    }, appOrigin + API_PATHS.session)
    expect(result).toEqual({
      status: signedIn ? 200 : 401,
      body: signedIn ? { user: fakeUser, appAccess: true } : signedOut,
    })
    const outgoing = requests.at(-1)
    expect(outgoing).toEqual({
      origin: DESKTOP_ORIGIN,
      credentialPresent: signedIn,
    })
    return { response: result, outgoing }
  }
}

/** Redirect only the device upgrade to this test's real, isolated relay. */
export async function installDeviceNetwork(
  electron: ElectronApplication,
  appOrigin: string,
  port: number,
): Promise<void> {
  await electron.evaluate(
    (_electron, input) => {
      const https = process.getBuiltinModule('node:https')
      const http = process.getBuiltinModule('node:http')
      const original = https.request
      function request(
        resource: string | URL | RequestOptions,
        options?: RequestOptions | ((response: IncomingMessage) => void),
        callback?: (response: IncomingMessage) => void,
      ): ClientRequest {
        const settings = typeof options === 'object' ? options : {}
        const listener = typeof options === 'function' ? options : callback
        if (typeof resource === 'object' && !(resource instanceof URL)) {
          if (
            (resource.hostname ?? resource.host) ===
              new URL(input.appOrigin).hostname &&
            resource.path?.startsWith(input.connectionPrefix)
          ) {
            const redirected = {
              ...resource,
              protocol: 'http:',
              host: '127.0.0.1',
              hostname: '127.0.0.1',
              port: input.port,
              agent: http.globalAgent,
              createConnection: undefined,
            }
            Reflect.deleteProperty(redirected, '_defaultAgent')
            Reflect.deleteProperty(redirected, 'defaultPort')
            return http.request(redirected, listener)
          }
          return original({ ...resource, ...settings }, listener)
        }
        return original(resource, settings, listener)
      }
      https.request = request
      const fetchOriginal = globalThis.fetch
      globalThis.fetch = async (resource, options) => {
        const request =
          resource instanceof Request
            ? resource
            : new Request(resource, options)
        if (request.url !== input.appOrigin + input.sessionPath)
          return fetchOriginal(resource, options)
        if (
          request.headers.get('Origin') !== input.desktopOrigin ||
          request.headers.get('Cookie') !==
            `${input.cookieName}=session.signature`
        )
          return new Response(null, { status: 401 })
        return Response.json({ user: { id: 'user-one' }, appAccess: true })
      }
    },
    {
      appOrigin,
      port,
      connectionPrefix: deviceConnectionPath('').split('?')[0],
      sessionPath: API_PATHS.session,
      desktopOrigin: DESKTOP_ORIGIN,
      cookieName: DESKTOP_SESSION_COOKIE,
    },
  )
}
