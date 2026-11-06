import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { capturePictures } from './capture-pictures.ts'
import { launchChrome, type Browser } from './cdp.ts'
import { encodePictures } from './encode-pictures.ts'
import { buildMockups } from './processes.ts'
import { serveMockups } from './server.ts'

async function regenerate(signal: AbortSignal): Promise<void> {
  await buildMockups(signal)
  const temporary = await mkdtemp(join(tmpdir(), 'conducting-pictures-'))
  let server: Awaited<ReturnType<typeof serveMockups>> | undefined
  let browser: Browser | undefined
  try {
    server = await serveMockups('mokly-static')
    browser = await launchChrome(signal)
    const raw = join(temporary, 'png')
    const encoded = join(temporary, 'webp')
    const stems = await capturePictures(browser, server.origin, raw)
    await encodePictures(raw, encoded, stems)
    signal.throwIfAborted()
    for (const stem of stems) {
      const name = `${stem}.webp`
      await copyFile(join(encoded, name), join('src/marketing/pictures', name))
    }
    console.log(`Updated ${stems.length} marketing pictures.`)
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
  await regenerate(controller.signal)
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  process.off('SIGINT', interrupt)
  process.off('SIGTERM', interrupt)
}
