import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { capturePictures } from './capture-pictures.ts'
import { capturePreview } from './capture-preview.ts'
import { launchChrome, type Browser } from './cdp.ts'
import { encodePictures } from './encode-pictures.ts'
import { openPage, type Viewport } from './page.ts'
import { buildMockups } from './processes.ts'
import { serveMockups } from './server.ts'

async function regenerate(
  signal: AbortSignal,
  previewOnly: boolean,
): Promise<void> {
  await buildMockups(signal)
  const temporary = await mkdtemp(join(tmpdir(), 'conductive-pictures-'))
  let server: Awaited<ReturnType<typeof serveMockups>> | undefined
  let browser: Browser | undefined
  try {
    server = await serveMockups('mokly-static')
    const captureBrowser = await launchChrome(signal)
    browser = captureBrowser
    const createPage = (viewport: Viewport, scale?: number) =>
      openPage(captureBrowser, viewport, scale)
    const raw = join(temporary, 'png')
    const encoded = join(temporary, 'webp')
    let stems: string[] = []
    if (!previewOnly) {
      stems = await capturePictures({
        origin: server.origin,
        directory: raw,
        openPage: createPage,
      })
      await encodePictures(raw, encoded, stems)
    }
    const preview = join(temporary, 'link-preview.png')
    await capturePreview({
      origin: server.origin,
      path: preview,
      openPage: createPage,
    })
    signal.throwIfAborted()
    for (const stem of stems) {
      const name = `${stem}.webp`
      await copyFile(join(encoded, name), join('src/marketing/pictures', name))
    }
    await copyFile(preview, 'src/marketing/pictures/link-preview.png')
    if (previewOnly) console.log('Updated the link preview.')
    else
      console.log(
        `Updated ${stems.length} marketing pictures and the link preview.`,
      )
  } finally {
    try {
      await browser?.close()
    } finally {
      try {
        await server?.close()
      } finally {
        await rm(temporary, { recursive: true, force: true })
      }
    }
  }
}

const controller = new AbortController()
const interrupt = () =>
  controller.abort(new Error('Picture capture interrupted'))
process.on('SIGINT', interrupt)
process.on('SIGTERM', interrupt)
try {
  await regenerate(controller.signal, process.argv.includes('--preview-only'))
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  process.off('SIGINT', interrupt)
  process.off('SIGTERM', interrupt)
}
