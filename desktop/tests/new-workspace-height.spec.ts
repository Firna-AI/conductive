import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { routes } from '../../src/app/router.ts'
import { redPixelPng } from '../../src/app/screenshots/images.test-support.ts'
import { ACCOUNT_PATHS } from '../../src/shared/account.ts'
import { workspacesPath } from '../../src/shared/workspaces.ts'
import { FakeApiServer } from '../../src/test-support/fake-api.ts'
import { coreFixtures, FAKE_IDS } from '../../src/test-support/fixtures/core.ts'
import { withBrowserEntry } from './browser-entry.js'
import { installWindowApi } from './window-shell.js'

const window = { width: 1100, height: 480, useContentSize: true }
const evidence = resolve(
  import.meta.dirname,
  '../../.context/dialog-content-outside-window',
)
const lines = [
  'Add saved addresses to checkout.',
  'Keep the address form on one page.',
  'Show saved addresses above the form.',
  'Use a saved address when it is chosen.',
  'Keep the current values until then.',
  'Allow a customer to enter a new address.',
  'Keep the country choice visible.',
  'Show postcode errors below the field.',
  'Keep the order total beside the form.',
  'Keep the payment choice after an edit.',
  'Support a narrow browser window.',
  'Keep keyboard focus in the form.',
  'Check the attached checkout screenshots.',
  'Run the checkout tests after the change.',
]
const screenshots = Array.from({ length: 12 }, (_, index) => ({
  name: `checkout-address-autocomplete-${index + 1}.png`,
  mimeType: 'image/png',
  buffer: Buffer.from(redPixelPng()),
}))
const startupError = [
  'The startup script exited with code 1.',
  'npm could not install the browser tests because the browser download did not finish.',
  'The download stopped while it read chromium-linux.zip from the package mirror.',
  'The package server closed the connection before the complete archive arrived.',
  'The cloud computer has no cached copy of that archive.',
  'Check network access to the package mirror and run the installation again.',
  'If the download still fails, update the install script to use an available mirror.',
  'Open the Cloud computer settings to read the build output and correct the script.',
  'Then build the cloud computer again before you create the workspace.',
].join(' ')

async function pointerClick(page: Page, control: Locator): Promise<void> {
  // Check before the click. A locator click could scroll the clipping frame.
  await expect(control).toBeInViewport({ ratio: 1 })
  const box = await control.boundingBox()
  if (!box) throw new Error('The control has no box.')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

test('at the minimum window height a tall New workspace keeps its pickers and Create reachable', async () => {
  const server = new FakeApiServer()
  server.json('GET', ACCOUNT_PATHS.account, {
    ...coreFixtures().account,
    newWorkspaceView: 'dialog',
  })
  server.json(
    'POST',
    workspacesPath(FAKE_IDS.org),
    { error: { code: 'workspace_start_failed', message: startupError } },
    502,
  )
  await mkdir(evidence, { recursive: true })
  await withBrowserEntry(
    'new-workspace-height',
    window,
    async ({ page, origin }) => {
      try {
        await installWindowApi(page, origin, false, server)
        await page.goto(new URL(routes.org(FAKE_IDS.org), origin).href)
        await page
          .getByRole('complementary', { name: 'Workspaces', exact: true })
          .getByRole('link', { name: 'New workspace', exact: true })
          .click()
        const dialog = page.getByRole('dialog', { name: 'New workspace' })
        const message = dialog.getByRole('textbox', { name: 'Message' })
        await expect(message).toBeFocused()
        for (const [index, line] of lines.entries()) {
          if (index > 0) await page.keyboard.press('Shift+Enter')
          await page.keyboard.type(line)
        }
        await dialog.locator('input[type="file"]').setInputFiles(screenshots)
        await expect(
          dialog.getByRole('button', { name: /^Remove checkout-address-/ }),
        ).toHaveCount(12)
        const create = dialog.getByRole('button', {
          name: 'Create',
          exact: true,
        })
        await expect(create).toBeEnabled()
        await message.focus()
        await page.keyboard.press('Enter')
        const failure = dialog.getByText("The workspace wasn't created", {
          exact: true,
        })
        await expect(failure).toBeVisible()
        const repository = dialog.getByRole('button', { name: /^Repository:/ })
        const section = dialog.getByRole('button', { name: /^Section:/ })
        const model = dialog.getByRole('button', { name: /^Model and effort:/ })
        const capabilities = dialog.getByRole('button', {
          name: 'Capabilities',
        })
        await expect(repository).toBeInViewport({ ratio: 1 })
        await expect(create).toBeInViewport({ ratio: 1 })

        await pointerClick(page, repository)
        const repositories = page.getByRole('menu', {
          name: 'Repository',
          exact: true,
        })
        await pointerClick(
          page,
          repositories.getByRole('menuitemradio', {
            name: 'acme/storefront',
            exact: true,
          }),
        )
        await expect(repositories).toHaveCount(0)
        await pointerClick(page, section)
        const sections = page.getByRole('menu', {
          name: 'Section',
          exact: true,
        })
        await pointerClick(
          page,
          sections.getByRole('menuitemradio', { name: 'General', exact: true }),
        )
        await expect(sections).toHaveCount(0)
        await pointerClick(page, model)
        const models = page.getByRole('menu', {
          name: 'Model and effort',
          exact: true,
        })
        // Effort opens the efforts of the model in its submenu.
        await pointerClick(
          page,
          models.getByRole('menuitem', { name: /^Effort / }),
        )
        const efforts = page.getByRole('menu', { name: 'Effort', exact: true })
        await pointerClick(
          page,
          efforts.getByRole('menuitemradio', { name: 'Low', exact: true }),
        )
        await expect(models).toHaveCount(0)
        await pointerClick(page, capabilities)
        await expect(
          page.getByRole('dialog', { name: 'Capabilities', exact: true }),
        ).toBeInViewport({ ratio: 1 })
        await page.keyboard.press('Escape')
        await expect(capabilities).toBeFocused()

        await expect(failure).toBeInViewport({ ratio: 1 })
        const noticeTitle = await failure.boundingBox()
        if (!noticeTitle) throw new Error('The failure notice has no box.')
        // Wheel over the notice so the dialog body receives the scroll.
        await page.mouse.move(
          noticeTitle.x + noticeTitle.width / 2,
          noticeTitle.y + noticeTitle.height / 2,
        )
        await page.mouse.wheel(0, 2000)
        await expect(
          dialog.getByRole('button', { name: 'Try again' }),
        ).toBeInViewport({
          ratio: 1,
        })
        await expect(repository).toBeInViewport({ ratio: 1 })
        await expect(create).toBeInViewport({ ratio: 1 })
        await page.screenshot({
          path: resolve(evidence, 'regression-pass.png'),
        })
        const secondCreate = page.waitForRequest(
          (request) =>
            request.method() === 'POST' &&
            new URL(request.url()).pathname === workspacesPath(FAKE_IDS.org),
        )
        await pointerClick(page, create)
        await secondCreate
        await expect(failure).toBeVisible()
      } catch (error) {
        await page.screenshot({
          path: resolve(evidence, 'regression-failure.png'),
        })
        throw error
      }
    },
  )
})
