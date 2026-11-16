import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Locator } from '@playwright/test'
import { build, preview, type PreviewServer } from 'vite'

const desktop = resolve(import.meta.dirname, '..')
const repository = resolve(desktop, '..')
const config = resolve(repository, 'src/chat/dev/vite.config.js')

/**
 * The chat development page with four requests that wait in the Mac app on
 * the Mac that got them. The first runs a long script.
 */
const requests = new URLSearchParams({
  scenario: 'running',
  state: 'input',
  mac: 'many',
  app: 'mac',
  viewport: 'desktop',
  scheme: 'dark',
  clock: 'frozen',
})

/** Builds the development page with its own Vite configuration, and serves it. */
async function servePage(site: string): Promise<PreviewServer> {
  await build({
    configFile: config,
    logLevel: 'error',
    publicDir: false,
    build: {
      outDir: site,
      emptyOutDir: true,
      rollupOptions: { input: resolve(repository, 'src/chat/dev/index.html') },
    },
  })
  return preview({
    configFile: config,
    logLevel: 'warn',
    build: { outDir: site },
    preview: { host: '127.0.0.1', port: 0 },
  })
}

/** The top and the bottom edge of the part of an element that shows. */
async function edges(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('The element has no box')
  return { top: box.y, bottom: box.y + box.height }
}

/**
 * Presses a key that scrolls the region, then waits for the end of that
 * scroll. Chromium animates a keyboard scroll. The page shows the end
 * offset before the animation ends, and `scrollend` comes after that end.
 * A press in this gap changes only the target of the old animation. The end
 * of the old animation then drops that target, so the press does not
 * scroll. The wait for `scrollend` keeps two key scrolls from overlapping.
 */
async function scrollWithKey(region: Locator, key: 'PageDown' | 'Home') {
  // The listener starts before the press, so it cannot miss the end.
  const scroll = await region.evaluateHandle((node) => {
    const state = { ended: false }
    node.addEventListener(
      'scrollend',
      () => {
        state.ended = true
      },
      { once: true },
    )
    return state
  })
  await region.page().keyboard.press(key)
  await expect
    .poll(() => scroll.evaluate((state) => state.ended), {
      message: `The region ends the scroll of ${key}`,
    })
    .toBe(true)
  await scroll.dispose()
}

test('the Mac app keeps many waiting commands above a reachable composer, scrolls a long one from the keyboard, and opens Allow over the region', async () => {
  const evidence = resolve(repository, '.context/boat-native-remote-workspaces')
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(resolve(evidence, 'approval-profile-'))
  const site = await mkdtemp(join(tmpdir(), 'approval-region-'))
  let server: PreviewServer | undefined
  let electron: ElectronApplication | undefined
  try {
    server = await servePage(site)
    const origin = server.resolvedUrls?.local[0]
    if (!origin) throw new Error('The preview server has no address')
    electron = await _electron.launch({
      args: ['.', `--user-data-dir=${profile}`],
      cwd: desktop,
    })
    const page = await electron.firstWindow()
    await electron.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setContentSize(1440, 900)
    })
    // The navigation waits for its own load, so a late event of the bundled
    // page cannot end it, as it can end the promise of `loadURL`.
    await page.goto(new URL(`src/chat/dev/?${requests}`, origin).href)

    const region = page.getByRole('group', {
      name: 'Commands that wait for an answer',
    })
    const waiting = region.getByRole('region', {
      name: 'Run a command on this Mac?',
    })
    await expect(waiting).toHaveCount(4)
    const composer = page.getByRole('textbox', { name: 'Message' })
    await expect(composer).toBeInViewport({ ratio: 1 })
    // A press reaches the composer: no request covers it.
    await composer.click({ trial: true })
    const chat = await edges(page.getByRole('region', { name: 'Chat' }))
    const bounds = await edges(region)
    const typing = await edges(composer)
    expect(bounds.top).toBeGreaterThanOrEqual(chat.top)
    expect(bounds.bottom).toBeLessThanOrEqual(typing.top)
    expect(typing.bottom).toBeLessThanOrEqual(chat.bottom)

    // The oldest request comes first, and it runs the long script, which
    // starts in view and ends past the edge of the region.
    const first = waiting.first()
    const script = first
      .getByRole('code')
      .filter({ hasText: 'set -euo pipefail' })
    expect((await edges(script)).top).toBeGreaterThanOrEqual(bounds.top)
    expect((await edges(script)).bottom).toBeGreaterThan(bounds.bottom)
    await first.getByRole('button', { name: 'Deny', exact: true }).focus()
    for (let press = 0; press < 20; press += 1) {
      const before = await edges(script)
      if (before.bottom <= bounds.bottom) break
      await scrollWithKey(region, 'PageDown')
      await expect
        .poll(async () => (await edges(script)).top)
        .toBeLessThan(before.top)
    }
    expect((await edges(script)).bottom).toBeLessThanOrEqual(bounds.bottom)
    await scrollWithKey(region, 'Home')
    await expect
      .poll(async () => (await edges(script)).top)
      .toBeGreaterThan(bounds.top)

    const arrow = first.getByRole('button', { name: 'More ways to allow' })
    await arrow.click()
    const always = page.getByRole('menuitem', { name: 'Always allow' })
    await expect(always).toBeFocused()
    await expect(always).toBeInViewport({ ratio: 1 })
    expect((await edges(always)).bottom).toBeLessThanOrEqual(bounds.top)
    await page.keyboard.press('ArrowDown')
    await expect(
      page.getByRole('menuitem', { name: 'Allow all commands for 15 minutes' }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('menu', { name: 'More ways to allow' }),
    ).toHaveCount(0)
    await expect(arrow).toBeFocused()
  } finally {
    await electron?.close()
    await server?.close()
    await rm(profile, { recursive: true, force: true })
    await rm(site, { recursive: true, force: true })
  }
})
