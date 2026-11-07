import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { _electron, expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

import { productName } from '../../docs/mockups/src/brand.js'
import { routes } from '../../src/app/router.ts'
import { API_PATHS } from '../../src/shared/api.ts'
import { workspaceEventsPath } from '../../src/shared/events.ts'
import { FakeApiServer } from '../../src/test-support/fake-api.ts'
import { FAKE_IDS, FAKE_TIME } from '../../src/test-support/fixtures/core.ts'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../worker/security/desktop-contract.js'
import { readConfiguration } from '../src/config.js'
import { signInThroughMain } from './sign-in-journey.js'

export const desktop = resolve(import.meta.dirname, '..')
export const evidence = resolve(
  desktop,
  '../.context/boat-native-remote-workspaces',
)
export const workspacePath = routes.workspace(FAKE_IDS.org, FAKE_IDS.workspace)
export const workspaceTitle = 'Checkout address autocomplete'

export function launchWindow(profile: string) {
  const packaged = process.env.CONDUCTIVE_PACKAGED_APP
  return _electron.launch({
    ...(packaged ? { executablePath: packaged } : {}),
    args: [
      ...(packaged ? [] : ['.']),
      `--user-data-dir=${profile}`,
      '--lang=en-GB',
    ],
    env: { ...process.env, TZ: 'UTC' },
    cwd: desktop,
  })
}

export async function installWindowApi(
  page: Page,
  appOrigin: string,
  desktopSession: boolean,
) {
  const server = new FakeApiServer()
  await page.clock.setFixedTime(FAKE_TIME)
  await page.context().route(appOrigin + '/api/**', async (route) => {
    const request = route.request()
    const headers = await request.allHeaders()
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
    const signedIn =
      !desktopSession ||
      headers.cookie === `${DESKTOP_SESSION_COOKIE}=session.signature`
    const response = signedIn
      ? await server.fetch(
          new Request(request.url(), {
            method: request.method(),
            headers,
            body: request.postData(),
          }),
        )
      : Response.json(
          { error: { code: 'unauthorized', message: 'Sign in to continue.' } },
          { status: 401 },
        )
    await route.fulfill({
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...cors },
      body: await response.text(),
    })
  })
  const socketAddress = new URL(
    workspaceEventsPath(FAKE_IDS.org, FAKE_IDS.workspace, 0),
    appOrigin,
  )
  socketAddress.protocol = socketAddress.protocol === 'https:' ? 'wss:' : 'ws:'
  await page.routeWebSocket(
    (url) =>
      url.origin === socketAddress.origin &&
      url.pathname === socketAddress.pathname,
    (socket) => socket.send(JSON.stringify(server.events.history(0))),
  )
}

export async function openWindowWorkspace(electron: ElectronApplication) {
  const page = await electron.firstWindow()
  await expect(page).toHaveTitle(productName)
  await page.waitForLoadState('domcontentloaded')
  const configuration: unknown = JSON.parse(
    await readFile(resolve(desktop, 'dist/bundle/build-config.json'), 'utf8'),
  )
  const { appOrigin } = readConfiguration(configuration)
  await installWindowApi(page, appOrigin, true)
  // The layout fixture has no connected local device. Keep its session offline.
  await electron.evaluate(
    (_electron, input) => {
      const original = globalThis.fetch
      globalThis.fetch = async (resource, options) => {
        const request =
          resource instanceof Request
            ? resource
            : new Request(resource, options)
        if (request.url === input.sessionUrl)
          return new Response(null, { status: 401 })
        return original(resource, options)
      }
    },
    { sessionUrl: appOrigin + API_PATHS.session },
  )
  const reloaded = page.waitForEvent('domcontentloaded')
  await signInThroughMain(electron, appOrigin)
  await reloaded
  await expect(
    page.getByRole('link', { name: 'Account', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('complementary', { name: 'Workspaces', exact: true })
    .getByRole('link', { name: new RegExp(workspaceTitle) })
    .click()
  await expect(page).toHaveURL(DESKTOP_ORIGIN + workspacePath)
  await expect(
    page.getByRole('heading', { name: workspaceTitle, exact: true }),
  ).toBeVisible()
  return page
}
