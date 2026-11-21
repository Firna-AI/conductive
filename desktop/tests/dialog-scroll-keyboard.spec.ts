import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

import { FakeApiServer } from '../../src/test-support/fake-api.ts'
import {
  serveHeld,
  serveRepositoryChange,
} from '../../src/test-support/fake-repository-change.ts'
import { withBrowserEntry } from './browser-entry.js'
import { installWindowApi, workspacePath } from './window-shell.js'

const window = { width: 1280, height: 480, useContentSize: true }
const evidence = resolve(
  import.meta.dirname,
  '../../.context/dialog-scroll-body-keyboard-reach',
)

test('at the minimum window height keyboard users can read the full Change repository work list and cancel', async () => {
  const server = new FakeApiServer()
  serveHeld(server, ['storefront', 'billing-service', 'marketing-site'])
  serveRepositoryChange(server, 'question')
  await mkdir(evidence, { recursive: true })
  await withBrowserEntry(
    'dialog-scroll-keyboard',
    window,
    async ({ page, origin }) => {
      try {
        await installWindowApi(page, origin, false, server)
        await page.goto(new URL(workspacePath, origin).href)
        const repository = page.getByRole('button', {
          name: 'Repository: acme/storefront',
          exact: true,
        })
        await repository.click()
        await page
          .getByRole('menu', { name: 'Repository', exact: true })
          .getByRole('menuitemradio', {
            name: 'acme/billing-service',
            exact: true,
          })
          .click()
        const dialog = page.getByRole('dialog', {
          name: 'Change repository?',
          exact: true,
        })
        const cancel = dialog.getByRole('button', {
          name: 'Cancel',
          exact: true,
        })
        const change = dialog.getByRole('button', {
          name: 'Change repository',
          exact: true,
        })
        const carriedFile = dialog
          .getByRole('list', {
            name: 'This work in acme/billing-service moves to the new branch:',
            exact: true,
          })
          .getByRole('listitem')
        await expect(cancel).toBeFocused()
        await expect(carriedFile).toHaveText(
          'src/invoices/refunds.tsnot committed',
        )
        await expect(carriedFile).not.toBeInViewport({ ratio: 1 })
        await page.keyboard.press('Tab')
        await expect(change).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(dialog.locator(':focus')).toHaveCount(1)
        await page.keyboard.press('PageDown')
        await expect(carriedFile).toBeInViewport({ ratio: 1 })
        await expect(cancel).not.toBeFocused()
        await expect(change).not.toBeFocused()
        await page.keyboard.press('Tab')
        await expect(cancel).toBeFocused()
        await page.keyboard.press('Shift+Tab')
        await expect(dialog.locator(':focus')).toHaveCount(1)
        await expect(cancel).not.toBeFocused()
        await expect(change).not.toBeFocused()
        await page.keyboard.press('Shift+Tab')
        await expect(change).toBeFocused()
        await page.keyboard.press('Shift+Tab')
        await expect(cancel).toBeFocused()
        await page.screenshot({
          path: resolve(evidence, 'regression-pass.png'),
        })
        await page.keyboard.press('Escape')
        await expect(dialog).toHaveCount(0)
        await expect(repository).toBeVisible()
      } catch (error) {
        await page.screenshot({
          path: resolve(evidence, 'regression-failure.png'),
        })
        throw error
      }
    },
  )
})
