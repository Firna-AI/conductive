import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication, Locator } from '@playwright/test'

import {
  evidence,
  launchWindow,
  openWindowWorkspace,
  workspaceTitle,
} from './window-shell.js'

/** The drag region of an element. It has no accessible state. */
function region(element: Locator) {
  return element.evaluate((node) =>
    getComputedStyle(node).getPropertyValue('-webkit-app-region'),
  )
}

// macOS gives a press on a drag region to the window, and the page never
// hears it. Playwright presses through the page, so this test checks the
// regions that macOS reads.
test('an open menu stops the drag regions, so a press on a top bar closes it', async () => {
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(resolve(evidence, 'menu-drag-profile-'))
  let electron: ElectronApplication | undefined
  try {
    electron = await launchWindow(profile)
    const page = await openWindowWorkspace(electron)
    const header = page
      .getByRole('heading', { name: workspaceTitle, exact: true })
      .locator('xpath=ancestor::header[1]')
    const controls = page.getByRole('navigation', { name: 'Window controls' })
    await expect.poll(() => region(header)).toBe('drag')
    await expect.poll(() => region(controls)).toBe('drag')

    const owner = page.getByRole('button', { name: 'Owner: Cal', exact: true })
    await owner.click()
    const menu = page.getByRole('menu', { name: 'Owner', exact: true })
    await expect(menu).toBeVisible()
    await expect.poll(() => region(header)).toBe('no-drag')
    await expect.poll(() => region(controls)).toBe('no-drag')

    await page
      .getByRole('heading', { name: workspaceTitle, exact: true })
      .click()
    await expect(menu).toBeHidden()
    await expect(owner).toHaveAttribute('aria-expanded', 'false')
    await expect.poll(() => region(header)).toBe('drag')
    await expect.poll(() => region(controls)).toBe('drag')
  } finally {
    await electron?.close()
    await rm(profile, { recursive: true, force: true })
  }
})
