import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, expect, test, type Page } from '@playwright/test'
import { build, preview, type PreviewServer } from 'vite'

const repository = resolve(import.meta.dirname, '../..')
const config = resolve(repository, 'src/chat/dev/vite.config.js')

/** A recorded chat with no live events, so React leaves the transcript alone. */
const recorded = new URLSearchParams({
  scenario: 'history',
  viewport: 'desktop',
  scheme: 'dark',
  clock: 'frozen',
})

/** Builds the chat development page with its own Vite configuration, and serves it. */
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

/** Waits for two frames, so the browser lays out and its observers run. */
const frames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      ),
  )

/**
 * Adds a row of 20.8 px, the height of a line of chat text, under the
 * transcript, as an agent that writes a line does. The fraction of a pixel
 * changes the rounding of the scroll range with each row.
 */
async function addRow(page: Page) {
  await page.evaluate(() => {
    const transcript = document.querySelector('section[aria-label="Chat"]')
      ?.firstElementChild?.firstElementChild
    if (!transcript) throw new Error('No transcript shows')
    const row = document.createElement('div')
    row.style.height = '20.8px'
    row.style.flex = 'none'
    row.textContent = `Row ${transcript.children.length}`
    transcript.append(row)
  })
  await frames(page)
}

/** The box of the chat, the newest row, and the first row in full view. */
function places(page: Page) {
  return page.evaluate(() => {
    const box = document.querySelector(
      'section[aria-label="Chat"]',
    )?.firstElementChild
    const rows = Array.from(box?.firstElementChild?.children ?? [])
    const newest = rows.at(-1)
    if (!box || !newest) throw new Error('No transcript shows')
    const edges = box.getBoundingClientRect()
    const read = rows.find(
      (row) => row.getBoundingClientRect().top >= edges.top,
    )
    return {
      boxBottom: edges.bottom,
      newestBottom: newest.getBoundingClientRect().bottom,
      read: read ? rows.indexOf(read) : -1,
      readTop: read?.getBoundingClientRect().top ?? 0,
    }
  })
}

/** The top of the row at this index of the transcript. */
const topOf = (page: Page, index: number) =>
  page.evaluate((index) => {
    const row = document.querySelector('section[aria-label="Chat"]')
      ?.firstElementChild?.firstElementChild?.children[index]
    if (!row) throw new Error(`No row ${index}`)
    return row.getBoundingClientRect().top
  }, index)

/** Turns the wheel over the chat, as the reader does, and waits for the layout. */
async function wheel(page: Page, deltaY: number) {
  await page.mouse.wheel(0, deltaY)
  await frames(page)
}

test('the chat follows its newest row after a wheel scroll to the end, and keeps the read row while the reader is scrolled up', async () => {
  await mkdir(resolve(repository, '.context'), { recursive: true })
  const site = await mkdtemp(resolve(repository, '.context/chat-scroll-'))
  let server: PreviewServer | undefined
  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    server = await servePage(site)
    const origin = server.resolvedUrls?.local[0]
    if (!origin) throw new Error('The preview server has no address')
    const page = await browser.newPage({
      viewport: { width: 1440, height: 700 },
      deviceScaleFactor: 1,
    })
    await page.goto(new URL(`src/chat/dev/?${recorded}`, origin).href)
    const chat = page.getByRole('region', { name: 'Chat', exact: true })
    await expect(chat).toBeVisible()
    for (let row = 0; row < 30; row += 1) await addRow(page)
    const box = await chat.boundingBox()
    if (!box) throw new Error('The chat has no box')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3)

    // Each round adds one row, so the scroll range rounds in another way.
    // A wheel scroll to the end can stop a pixel past the end, and there a
    // browser with scroll anchoring moves the newest row out of view.
    for (let round = 0; round < 5; round += 1) {
      await addRow(page)
      await wheel(page, -300)
      await wheel(page, 3000)
      for (let step = 0; step < 3; step += 1) {
        await addRow(page)
        const shown = await places(page)
        expect(
          shown.newestBottom,
          `round ${round}, row ${step}: the newest row shows`,
        ).toBeLessThanOrEqual(shown.boxBottom + 0.5)
      }
    }

    // While the reader is scrolled up, the read row keeps its place as
    // rows arrive under it. Chrome keeps scroll positions in whole pixels,
    // so each row can move it by a fraction of a pixel.
    await wheel(page, -300)
    const before = await places(page)
    for (let step = 0; step < 4; step += 1) await addRow(page)
    const after = await topOf(page, before.read)
    expect(Math.abs(after - before.readTop)).toBeLessThan(1.5)
  } finally {
    await browser.close()
    await server?.close()
    await rm(site, { recursive: true, force: true })
  }
})
