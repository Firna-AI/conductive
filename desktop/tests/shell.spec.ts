import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'

import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'

const desktop = resolve(import.meta.dirname, '..')
const evidence = resolve(desktop, '../.context/boat-native-remote-workspaces')

test('the bundled app keeps navigation inside one isolated window and restores its bounds', async () => {
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(resolve(evidence, 'desktop-profile-'))
  let electron: ElectronApplication | undefined
  const packaged = process.env.CONDUCTING_PACKAGED_APP
  const launch = () =>
    _electron.launch({
      ...(packaged ? { executablePath: packaged } : {}),
      args: [...(packaged ? [] : ['.']), `--user-data-dir=${profile}`],
      cwd: desktop,
    })
  try {
    electron = await launch()
    let page = await electron.firstWindow()
    await expect(
      page.getByRole('heading', { name: 'Conducting', exact: true }),
    ).toBeVisible()
    await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/`)
    const nav = page.getByRole('navigation', { name: 'Window controls' })
    await expect(nav).toBeVisible()
    const box = await nav.boundingBox()
    expect(box?.height).toBe(34)
    await expect(
      page.getByRole('button', { name: 'Back', exact: true }),
    ).toBeDisabled()

    // The minimal app has no product links. Arrange a real browser link click.
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
        process.env.CONDUCTING_TEST_OPENED = url
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
      .poll(() => electron!.evaluate(() => process.env.CONDUCTING_TEST_OPENED))
      .toBe('https://example.com/review')
    expect(electron.windows()).toHaveLength(1)
    await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/history`)

    // Read-only host evidence verifies the real protocol and renderer boundary.
    const host = await electron.evaluate(async ({ app, BrowserWindow }) => {
      const active = BrowserWindow.getAllWindows()[0]
      const response = await active.webContents.session.fetch(
        'conducting-app://desktop/',
      )
      const preferences: unknown = Reflect.apply(
        Reflect.get(active.webContents, 'getLastWebPreferences'),
        active.webContents,
        [],
      )
      active.setBounds({ x: 20, y: 20, width: 1200, height: 800 })
      return {
        packaged: app.isPackaged,
        path: app.getAppPath(),
        policy: response.headers.get('Content-Security-Policy'),
        preferences,
        electronVersion: process.versions.electron,
      }
    })
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
    await expect(
      page.getByRole('heading', { name: 'Conducting', exact: true }),
    ).toBeVisible()
    expect(
      await electron.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].getNormalBounds(),
      ),
    ).toEqual({ x: 20, y: 20, width: 1200, height: 800 })
  } finally {
    await electron?.close()
    await rm(profile, { recursive: true, force: true })
  }
})
