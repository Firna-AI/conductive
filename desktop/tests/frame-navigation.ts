import { expect } from '@playwright/test'
import type { ElectronApplication, Locator, Page } from '@playwright/test'

import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'

/**
 * A frame document can load before the browser routes pointer input to it.
 * Playwright can report a missed click as complete. Only routed input sets :hover.
 */
async function waitForPointer(link: Locator): Promise<void> {
  await expect
    .poll(async () => {
      await link.hover()
      return link.evaluate((element) => element.matches(':hover'))
    })
    .toBe(true)
}

/** Arrange real link and frame navigation to test the desktop boundaries. */
export async function expectFrameIsolation(
  electron: ElectronApplication,
  page: Page,
  appOrigin: string,
): Promise<void> {
  await page.evaluate((origin) => {
    const link = document.createElement('a')
    link.href = origin + '/trusted-popup'
    link.target = '_blank'
    document.body.append(link)
    link.click()
  }, DESKTOP_ORIGIN)
  await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/trusted-popup`)
  await page.evaluate((origin) => {
    window.open(origin + '/script-popup', '_blank')
  }, appOrigin)
  await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/script-popup`)
  await page.evaluate((origin) => {
    const child = document.createElement('iframe')
    child.title = 'Untrusted preview'
    child.sandbox.add('allow-popups')
    child.srcdoc = `<a target="_blank" href="${origin}/frame-takeover">Open app popup</a>
      <a target="_blank" href="${origin}/api/auth/github">Start sign-in</a>
      <a target="_blank" href="https://example.com/child">Open external link</a>
      <a target="_top" href="${origin}/child-top">Replace top page</a>`
    document.body.append(child)
  }, DESKTOP_ORIGIN)
  const child = page.getByTitle('Untrusted preview').contentFrame()
  const appPopup = child.getByRole('link', {
    name: 'Open app popup',
    exact: true,
  })
  await waitForPointer(appPopup)
  await appPopup.click()
  await child.getByRole('link', { name: 'Start sign-in', exact: true }).click()
  await child
    .getByRole('link', { name: 'Open external link', exact: true })
    .click()
  // This opener call proves that the prior child popup requests reached the native handler.
  await expect
    .poll(() => electron.evaluate(() => process.env.CONDUCTIVE_TEST_OPENED))
    .toBe('https://example.com/child')
  await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/script-popup`)
  await electron.evaluate(({ BrowserWindow }) => {
    const contents = BrowserWindow.getAllWindows()[0].webContents
    contents.on('will-navigate', (event) => {
      if (event.url.endsWith('/child-top')) {
        process.env.CONDUCTIVE_TEST_TOP_NAVIGATION = JSON.stringify({
          blocked: event.defaultPrevented,
          mainInitiator: event.initiator === contents.mainFrame,
        })
      }
    })
  })
  await page.evaluate((origin) => {
    const frame = document.createElement('iframe')
    frame.title = 'Top navigation preview'
    frame.sandbox.add('allow-top-navigation-by-user-activation')
    frame.srcdoc = `<a target="_top" href="${origin}/child-top">Replace top page</a>`
    document.body.append(frame)
  }, DESKTOP_ORIGIN)
  const topLink = page
    .getByTitle('Top navigation preview')
    .contentFrame()
    .getByRole('link', { name: 'Replace top page', exact: true })
  await waitForPointer(topLink)
  await topLink.click()
  await expect
    .poll(() =>
      electron.evaluate(() => process.env.CONDUCTIVE_TEST_TOP_NAVIGATION),
    )
    .toBe('{"blocked":true,"mainInitiator":false}')
  await expect(page).toHaveURL(`${DESKTOP_ORIGIN}/script-popup`)
  expect(electron.windows()).toHaveLength(1)
}
