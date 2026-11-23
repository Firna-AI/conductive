import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

import { routes } from '../../src/app/router.ts'
import { memberPath } from '../../src/shared/members.ts'
import { FakeApiServer } from '../../src/test-support/fake-api.ts'
import {
  serveHeld,
  serveRepositoryChange,
} from '../../src/test-support/fake-repository-change.ts'
import { FAKE_IDS } from '../../src/test-support/fixtures/core.ts'
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

test('a busy member question restores Cancel after the browser closes it', async () => {
  const server = new FakeApiServer()
  let release: () => void = () => undefined
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  const removalPath = memberPath(FAKE_IDS.org, 'priya')
  server.handle('DELETE', removalPath, async () => {
    await pending
    return new Response(null, { status: 204 })
  })
  await mkdir(evidence, { recursive: true })
  await withBrowserEntry(
    'native-dialog-reopen',
    window,
    async ({ page, origin }) => {
      try {
        await installWindowApi(page, origin, false, server)
        await page.goto(
          new URL(routes.settings(FAKE_IDS.org, 'members'), origin).href,
        )
        await page
          .getByRole('button', { name: 'Remove Priya Raman', exact: true })
          .click()
        const dialog = page.getByRole('dialog', {
          name: 'Remove Priya Raman from Acme?',
          exact: true,
        })
        const cancel = dialog.getByRole('button', {
          name: 'Cancel',
          exact: true,
        })
        const remove = dialog.getByRole('button', {
          name: 'Remove member',
          exact: true,
        })
        await expect(cancel).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(remove).toBeFocused()
        const deleting = page.waitForRequest(
          (request) =>
            request.method() === 'DELETE' &&
            new URL(request.url()).pathname === removalPath,
        )
        await page.keyboard.press('Enter')
        await deleting
        await expect(remove).toHaveAttribute('aria-busy', 'true')
        await page.keyboard.press('Shift+Tab')
        await expect(cancel).toBeFocused()
        // Observe the queued native close after its non-cancelable request.
        // Earlier StrictMode cleanup closes cannot make this signal ready.
        await dialog.evaluate((element) => {
          let forced = false
          element.addEventListener('cancel', (event) => {
            if (!event.cancelable) forced = true
          })
          element.addEventListener('close', () => {
            if (!forced) return
            queueMicrotask(() => {
              element.setAttribute('data-native-close-observed', 'true')
            })
          })
        })
        await page.keyboard.press('Escape')
        await page.keyboard.press('Escape')
        await page.keyboard.press('Escape')
        await expect(dialog).toHaveAttribute(
          'data-native-close-observed',
          'true',
        )
        await expect(dialog).toHaveAttribute('open', '')
        await expect(remove).toHaveAttribute('aria-busy', 'true')
        await expect(cancel).toBeFocused()
        await page.screenshot({
          path: resolve(evidence, 'reopen-regression-pass.png'),
        })
        release()
        await expect(dialog).toHaveCount(0)
      } catch (error) {
        await page.screenshot({
          path: resolve(evidence, 'reopen-regression-failure.png'),
        })
        throw error
      } finally {
        release()
      }
    },
  )
})
