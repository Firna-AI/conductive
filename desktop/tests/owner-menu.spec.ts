import { resolve } from 'node:path'
import { chromium, expect, test } from '@playwright/test'
import { createServer } from 'vite'

import { routes } from '../../src/app/router.ts'
import { FAKE_IDS } from '../../src/test-support/fixtures/core.ts'
import { toolFixtures } from '../../src/test-support/fixtures/tools.ts'

test('closes the owner menu when a press moves focus into a preview frame', async () => {
  const server = await createServer({
    configFile: resolve(
      import.meta.dirname,
      '../../src/shell/workspace/dev/vite.config.js',
    ),
    server: { host: '127.0.0.1', port: 0 },
  })
  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    await server.listen()
    const origin = server.resolvedUrls?.local[0]
    if (!origin) throw new Error('The development server has no address')
    const page = await browser.newPage()
    const { preview } = toolFixtures().preview
    await page.route(preview.url, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<button>Preview action</button>',
      }),
    )
    const path = routes.workspace(FAKE_IDS.org, FAKE_IDS.workspace, 'preview')
    await page.goto(new URL(path, origin).href)
    const previewAction = page
      .getByTitle(`Preview of port ${preview.port}`, { exact: true })
      .contentFrame()
      .getByRole('button', { name: 'Preview action', exact: true })
    await expect(previewAction).toBeVisible()
    const owner = page.getByRole('button', { name: 'Owner: Cal', exact: true })
    await owner.click()
    const menu = page.getByRole('menu', { name: 'Owner', exact: true })
    await expect(menu).toBeVisible()

    await previewAction.click()

    await expect(menu).toBeHidden()
    await expect(owner).toHaveAttribute('aria-expanded', 'false')
    await expect(previewAction).toBeFocused()
  } finally {
    await browser.close()
    await server.close()
  }
})
