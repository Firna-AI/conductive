import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { build, preview, type PreviewServer } from 'vite'

const repository = resolve(import.meta.dirname, '../..')
const desktop = resolve(repository, 'desktop')
const config = resolve(repository, 'src/chat/dev/vite.config.js')
const evidence = resolve(repository, '.context/shared-menu-surface')
const options = new URLSearchParams({
  scenario: 'history',
  state: 'ready',
  viewport: 'desktop',
  scheme: 'dark',
  clock: 'frozen',
})

test('the model menu reaches choices outside a clipping box, opens All models beside it, and returns focus after Escape', async () => {
  await mkdir(evidence, { recursive: true })
  const directory = await mkdtemp(resolve(evidence, 'm-'))
  const site = resolve(directory, 'site')
  let server: PreviewServer | undefined
  let electron: ElectronApplication | undefined
  let page: Page | undefined
  try {
    await build({
      configFile: config,
      logLevel: 'error',
      publicDir: false,
      build: {
        outDir: site,
        emptyOutDir: true,
        rollupOptions: {
          input: resolve(repository, 'src/chat/dev/index.html'),
        },
      },
    })
    server = await preview({
      configFile: config,
      logLevel: 'warn',
      build: { outDir: site },
      preview: { host: '127.0.0.1', port: 0 },
    })
    const origin = server.resolvedUrls?.local[0]
    if (!origin) throw new Error('The chat build has no preview address')
    const host = resolve(directory, 'browser.mjs')
    await writeFile(
      host,
      `import { app, BrowserWindow } from 'electron';
app.setPath('userData', ${JSON.stringify(resolve(directory, 'profile'))});
void app.whenReady().then(async () => {
const window = new BrowserWindow({width: 1440, height: 900, useContentSize: true,
webPreferences: {contextIsolation: true, sandbox: true, nodeIntegration: false}});
await window.loadURL('about:blank');
});
app.on('window-all-closed', () => app.quit());
`,
    )
    electron = await _electron.launch({
      args: [host, '--lang=en-GB'],
      cwd: desktop,
      env: { ...process.env, TZ: 'UTC' },
    })
    page = await electron.firstWindow()
    await page.goto(new URL(`src/chat/dev/?${options}`, origin).href)
    const picker = page.getByRole('button', { name: /^Model and effort:/ })
    await expect(picker).toHaveAccessibleName(
      'Model and effort: Opus 5.5, High',
    )

    // A user cannot add a clipping box from this page. Give the real picker
    // wrapper a clip, so the menu must reach beyond the box of its button.
    await picker.evaluate((button) => {
      const anchor = button.parentElement?.parentElement
      if (!anchor) throw new Error('The model picker has no wrapper')
      anchor.style.overflow = 'hidden'
    })
    await picker.click()
    const menu = page.getByRole('menu', {
      name: 'Model and effort',
      exact: true,
    })
    // Effort shows the current effort, and its submenu holds the efforts.
    const effort = menu.getByRole('menuitem', {
      name: 'Effort High',
      exact: true,
    })
    // Check the clip before a pointer action can scroll anything into view.
    await expect(effort).toBeInViewport({ ratio: 1 })
    const triggerBox = await picker.boundingBox()
    const choiceBox = await effort.boundingBox()
    if (!triggerBox || !choiceBox) throw new Error('The picker has no box')
    expect(choiceBox.y + choiceBox.height).toBeLessThanOrEqual(triggerBox.y)

    await effort.click()
    const efforts = page.getByRole('menu', { name: 'Effort', exact: true })
    await expect(efforts).toBeInViewport({ ratio: 1 })
    await expect(
      efforts.getByRole('menuitemradio', { name: 'High', exact: true }),
    ).toBeFocused()
    await efforts
      .getByRole('menuitemradio', { name: 'Low', exact: true })
      .click()
    await expect(menu).toHaveCount(0)
    await expect(picker).toHaveAccessibleName('Model and effort: Opus 5.5, Low')
    await picker.click()
    // The menu lists the starting favourites of the account first.
    await page.keyboard.press('Home')
    await expect(
      menu.getByRole('menuitemradio', { name: 'Opus 5.5 High', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(
      menu.getByRole('menuitemradio', { name: 'Opus 5.5 Max', exact: true }),
    ).toBeFocused()

    // All models opens its submenu beside the menu, level with its row, in
    // the top layer, so the clip of the box does not cut it either.
    const allModels = menu.getByRole('menuitem', {
      name: 'All models',
      exact: true,
    })
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press('ArrowDown')
    }
    await expect(allModels).toBeFocused()
    await page.keyboard.press('ArrowRight')
    const submenu = page.getByRole('menu', { name: 'All models', exact: true })
    const current = submenu.getByRole('menuitemradio', {
      name: 'Opus 5.5',
      exact: true,
    })
    await expect(current).toBeFocused()
    await expect(submenu).toBeInViewport({ ratio: 1 })
    const menuBox = await menu.boundingBox()
    const rowBox = await allModels.boundingBox()
    const submenuBox = await submenu.boundingBox()
    const firstBox = await submenu
      .getByRole('menuitemradio')
      .first()
      .boundingBox()
    if (!menuBox || !rowBox || !submenuBox || !firstBox) {
      throw new Error('All models has no box')
    }
    expect(submenuBox.x).toBeGreaterThanOrEqual(menuBox.x + menuBox.width)
    expect(Math.abs(firstBox.y - rowBox.y)).toBeLessThanOrEqual(1)
    await page.keyboard.press('ArrowLeft')
    await expect(submenu).toHaveCount(0)
    await expect(allModels).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(picker).toBeFocused()
  } catch (error) {
    await page?.screenshot({
      path: resolve(evidence, 'regression-failure.png'),
    })
    throw error
  } finally {
    await electron?.close()
    await server?.close()
    await rm(directory, { recursive: true, force: true })
  }
})
