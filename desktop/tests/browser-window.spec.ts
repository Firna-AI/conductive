import { expect, test } from '@playwright/test'

import { withBrowserEntry } from './browser-entry.js'
import {
  installWindowApi,
  workspacePath,
  workspaceTitle,
} from './window-shell.js'

test('the browser entry renders the workspace without desktop window controls', async () => {
  await withBrowserEntry(
    'browser-window',
    { width: 1296, height: 812 },
    async ({ page, origin }) => {
      await installWindowApi(page, origin, false)
      await page.goto(new URL(workspacePath, origin).href)
      await expect(
        page.getByRole('heading', { name: workspaceTitle, exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('complementary', { name: 'Workspaces', exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('navigation', { name: 'Window controls' }),
      ).toHaveCount(0)
      // The native reserve is decorative and has no accessible name.
      await expect(page.locator('[data-desktop-window-space]')).toHaveCount(0)
      await expect(
        page.getByRole('button', { name: 'Hide the sidebar', exact: true }),
      ).toHaveCount(0)
      await expect(
        page.getByRole('button', { name: 'Back', exact: true }),
      ).toHaveCount(0)
      await expect(
        page.getByRole('button', { name: 'Forward', exact: true }),
      ).toHaveCount(0)
    },
  )
})
