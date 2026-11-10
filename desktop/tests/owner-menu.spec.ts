import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, expect, test } from '@playwright/test'
import { build, preview, type PreviewServer } from 'vite'

import { routes } from '../../src/app/router.ts'
import { FAKE_IDS } from '../../src/test-support/fixtures/core.ts'
import { toolFixtures } from '../../src/test-support/fixtures/tools.ts'
import { installWindowApi } from './window-shell.js'

const repository = resolve(import.meta.dirname, '../..')
const config = resolve(repository, 'src/shell/workspace/dev/vite.config.js')

test('closes the owner menu when a press moves focus into a preview frame', async () => {
  await mkdir(resolve(repository, '.context'), { recursive: true })
  const site = await mkdtemp(resolve(repository, '.context/owner-menu-'))
  let server: PreviewServer | undefined
  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    // Use the built app and the API harness, so earlier production builds
    // cannot change which data source this test uses.
    await build({
      configFile: config,
      logLevel: 'error',
      publicDir: false,
      build: {
        outDir: site,
        emptyOutDir: true,
      },
    })
    server = await preview({
      configFile: config,
      logLevel: 'warn',
      build: { outDir: site },
      preview: { host: '127.0.0.1', port: 0 },
    })
    const origin = server.resolvedUrls?.local[0]
    if (!origin) throw new Error('The development server has no address')
    const page = await browser.newPage()
    await installWindowApi(page, new URL(origin).origin, false)
    const { preview: portPreview } = toolFixtures().preview
    await page.route(portPreview.url, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<button>Preview action</button>',
      }),
    )
    const path = routes.workspace(FAKE_IDS.org, FAKE_IDS.workspace, 'preview')
    await page.goto(new URL(path, origin).href)
    const previewAction = page
      .getByTitle(`Preview of port ${portPreview.port}`, { exact: true })
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
    await server?.close()
    await rm(site, { recursive: true, force: true })
  }
})
