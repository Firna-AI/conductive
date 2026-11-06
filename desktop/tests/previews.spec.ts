import { mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { _electron, chromium, expect, test } from '@playwright/test'
import type { Browser, ElectronApplication } from '@playwright/test'

import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../worker/security/desktop-contract.js'
import { previewHost } from './preview-host.js'
import { createPreviewServer } from './preview-server.js'

test('opens a Mac preview frame and hands its new tab to a browser without a sign-in session', async () => {
  const directory = await mkdtemp(
    resolve(
      import.meta.dirname,
      '../../.context/boat-native-remote-workspaces/mac-preview-',
    ),
  )
  const server = await createPreviewServer(directory)
  let electron: ElectronApplication | undefined
  let browser: Browser | undefined
  const args = [
    '--ignore-certificate-errors',
    '--no-proxy-server',
    '--host-resolver-rules=MAP app.conducting.test 127.0.0.1,MAP *.conducting-previews.test 127.0.0.1',
  ]
  try {
    const host = await previewHost(directory, server)
    electron = await _electron.launch({
      args: [host, ...args],
      cwd: resolve(import.meta.dirname, '..'),
    })
    const page = await electron.firstWindow()
    await expect(page.getByRole('status')).toHaveText('Ready.')
    await expect(
      page
        .getByTitle('Port preview')
        .contentFrame()
        .getByRole('heading', { name: 'Preview ready' }),
    ).toBeVisible()
    expect(
      server.requests.find((request) => request.host === 'app.conducting.test'),
    ).toMatchObject({
      origin: undefined,
      cookie: `${DESKTOP_SESSION_COOKIE}=mac-session`,
    })
    await page
      .getByTitle('Port preview')
      .contentFrame()
      .getByRole('link', { name: 'Open app popup' })
      .click()
    await page
      .getByTitle('Port preview')
      .contentFrame()
      .getByRole('link', { name: 'Mark child popup' })
      .click()
    const opened = async () => {
      const result = await electron!.evaluate(() => ({
        url: process.env.CONDUCTING_TEST_PREVIEW_EXTERNAL,
        error: process.env.CONDUCTING_TEST_PREVIEW_ERROR,
      }))
      if (result.error) throw new Error(result.error)
      return result.url
    }
    await expect.poll(opened).toBe('https://example.com/preview-marker')
    expect(
      server.requests.filter(
        (request) =>
          request.accept === 'application/json' &&
          request.host === 'app.conducting.test',
      ),
    ).toHaveLength(0)
    await page
      .getByRole('link', { name: 'Open in new tab', exact: true })
      .click({ noWaitAfter: true })
    await expect.poll(opened).toContain(server.authorizer + '#')
    const handoff = await opened()
    if (!handoff) throw new Error('Native preview handoff is missing')
    expect(
      server.requests.filter(
        (request) =>
          request.host === 'app.conducting.test' &&
          request.accept === 'application/json',
      ),
    ).toEqual([
      expect.objectContaining({
        cookie: `${DESKTOP_SESSION_COOKIE}=mac-session`,
        origin: DESKTOP_ORIGIN,
      }),
    ])
    // Electron cancels this navigation before commit. Read its authoritative main-frame URL.
    await expect
      .poll(() =>
        electron!.evaluate(
          ({ BrowserWindow }) =>
            BrowserWindow.getAllWindows()[0].webContents.mainFrame.url,
        ),
      )
      .toBe(`${DESKTOP_ORIGIN}/`)
    expect(electron.windows()).toHaveLength(1)
    // Only the external-browser boundary is replaced. Chrome owns a fresh, separate cookie jar.
    browser = await chromium.launch({ channel: 'chrome', args })
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    expect(await context.cookies()).toEqual([])
    const tab = await context.newPage()
    await tab.goto(handoff)
    await expect(
      tab.getByRole('heading', { name: 'Preview ready' }),
    ).toBeVisible()
    await expect(tab).toHaveURL(server.preview)
    expect(await context.cookies(server.appOrigin)).toEqual([])
    expect(
      server.requests
        .filter((request) => request.host !== 'app.conducting.test')
        .every((request) => !request.cookie.includes(DESKTOP_SESSION_COOKIE)),
    ).toBe(true)
    expect(
      server.requests.every((request) => !request.path.includes('grant=')),
    ).toBe(true)
    server.reject()
    await tab.goto(handoff)
    await expect(tab.getByRole('status')).toHaveText(
      'The preview is not available. Open it again from the workspace.',
    )
    await expect(tab).toHaveURL(server.authorizer)
    expect(electron.windows()).toHaveLength(1)
  } finally {
    await test.info().attach('Preview boundary requests', {
      body: JSON.stringify(server.requests),
      contentType: 'application/json',
    })
    await browser?.close()
    await electron?.close()
    await server.close()
    await rm(directory, { recursive: true, force: true })
  }
})
