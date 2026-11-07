import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'

import { productName } from '../../docs/mockups/src/brand.js'
import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'
import { readConfiguration } from '../src/config.js'
import { expectFrameIsolation } from './frame-navigation.js'
import {
  sessionEndpoint,
  signInThroughMain,
  storedSessionCookie,
} from './sign-in-journey.js'

const desktop = resolve(import.meta.dirname, '..')
const evidence = resolve(desktop, '../.context/boat-native-remote-workspaces')

test('the bundled app keeps one isolated window and restores its bounds and sign-in session', async () => {
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(resolve(evidence, 'desktop-profile-'))
  let electron: ElectronApplication | undefined
  const packaged = process.env.CONDUCTIVE_PACKAGED_APP
  const launch = () =>
    _electron.launch({
      ...(packaged ? { executablePath: packaged } : {}),
      args: [...(packaged ? [] : ['.']), `--user-data-dir=${profile}`],
      cwd: desktop,
    })
  try {
    electron = await launch()
    let page = await electron.firstWindow()
    await expect(page).toHaveTitle(productName)
    await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/`)
    const nav = page.getByRole('navigation', { name: 'Window controls' })
    await expect(nav).toBeVisible()
    const box = await nav.boundingBox()
    expect(box?.height).toBe(34)
    await expect(
      page.getByRole('button', { name: 'Back', exact: true }),
    ).toBeDisabled()

    // Use a fixed local link to test history without the product router.
    await page.evaluate((origin) => {
      const link = document.createElement('a')
      link.href = origin + '/history'
      document.body.append(link)
      link.click()
    }, DESKTOP_ORIGIN)
    await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/history`)
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/`)
    await page.getByRole('button', { name: 'Forward', exact: true }).click()
    await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/history`)

    // Capture the native browser boundary. No external browser opens in this test.
    await electron.evaluate(({ shell }) => {
      shell.openExternal = async (url) => {
        process.env.CONDUCTIVE_TEST_OPENED = url
      }
    })
    await page.evaluate(() => {
      const link = document.createElement('a')
      link.href = 'https://example.com/review'
      link.target = '_blank'
      document.body.append(link)
      link.click()
    })
    await expect
      .poll(() => electron!.evaluate(() => process.env.CONDUCTIVE_TEST_OPENED))
      .toBe('https://example.com/review')
    expect(electron.windows()).toHaveLength(1)
    await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/history`)
    const configuration: unknown = JSON.parse(
      await readFile(resolve(desktop, 'dist/bundle/build-config.json'), 'utf8'),
    )
    const { appOrigin } = readConfiguration(configuration)
    await expectFrameIsolation(electron, page, appOrigin)
    const fetchSession = await sessionEndpoint(page, appOrigin)
    await fetchSession(false)
    await signInThroughMain(electron, appOrigin)
    await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/`)
    const beforeRestart = await fetchSession(true)
    const cookieBeforeRestart = await storedSessionCookie(electron, appOrigin)

    // Read-only host evidence verifies the real protocol and renderer boundary.
    const host = await electron.evaluate(
      async ({ app, BrowserWindow, screen }) => {
        const active = BrowserWindow.getAllWindows()[0]
        const response = await active.webContents.session.fetch(
          'conductive-app://desktop/',
        )
        const preferences: unknown = Reflect.apply(
          Reflect.get(active.webContents, 'getLastWebPreferences'),
          active.webContents,
          [],
        )
        const { workArea } = screen.getDisplayMatching(active.getBounds())
        const bounds = {
          x: workArea.x + 20,
          y: workArea.y + 20,
          width: Math.min(1200, workArea.width - 40),
          height: Math.min(800, workArea.height - 40),
        }
        active.setBounds(bounds)
        return {
          packaged: app.isPackaged,
          name: app.getName(),
          path: app.getAppPath(),
          policy: response.headers.get('Content-Security-Policy'),
          preferences,
          electronVersion: process.versions.electron,
          bounds,
          url: active.webContents.getURL(),
          childTopNavigation: process.env.CONDUCTIVE_TEST_TOP_NAVIGATION,
        }
      },
    )
    expect(host.packaged).toBe(Boolean(packaged))
    expect(host.path.endsWith('app.asar')).toBe(Boolean(packaged))
    expect(host.preferences).toMatchObject({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
    })
    expect(host.preferences).not.toHaveProperty('preload')
    expect(host.policy).toContain("script-src 'self'")
    await page.screenshot({
      path: resolve(
        evidence,
        packaged ? 'desktop-packaged.png' : 'desktop-shell.png',
      ),
    })
    await writeFile(
      resolve(
        evidence,
        packaged ? 'desktop-packaged-host.json' : 'desktop-shell-host.json',
      ),
      JSON.stringify(host, null, 2) + '\n',
    )
    await electron.close()
    electron = undefined
    electron = await launch()
    page = await electron.firstWindow()
    await expect(page).toHaveTitle(productName)
    expect(
      await electron.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].getNormalBounds(),
      ),
    ).toEqual(host.bounds)
    const fetchRestoredSession = await sessionEndpoint(page, appOrigin)
    const afterRestart = await fetchRestoredSession(true)
    const cookieAfterRestart = await storedSessionCookie(electron, appOrigin)
    await writeFile(
      resolve(
        evidence,
        packaged
          ? 'desktop-packaged-session.json'
          : 'desktop-shell-session.json',
      ),
      JSON.stringify(
        {
          beforeRestart,
          afterRestart,
          cookieBeforeRestart,
          cookieAfterRestart,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await electron?.close()
    await rm(profile, { recursive: true, force: true })
  }
})
