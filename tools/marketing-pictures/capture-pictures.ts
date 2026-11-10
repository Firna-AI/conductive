import { mkdir, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'
import {
  capturePagePath,
  pictureCaptures,
  pictureFileName,
  pictureSchemes,
  type PictureCapture,
} from '../../docs/mockups/src/screens/marketingPictureCaptures.ts'
import {
  marketingPictures,
  screenSizes,
} from '../../docs/mockups/src/screens/marketingPictureList.ts'
import type { Page, Viewport } from './page.ts'

type CaptureOptions = {
  origin: string
  directory: string
  openPage: (
    viewport: Viewport,
  ) => Promise<Pick<Page, 'goto' | 'screenshot' | 'close'>>
  captures?: readonly PictureCapture[]
  createDirectory?: (directory: string) => Promise<void>
  writePicture?: (path: string, picture: Buffer) => Promise<void>
}

async function createDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true })
}

/** Capture named export pages at source viewports and clip their crops. */
export async function capturePictures({
  origin,
  directory,
  openPage,
  captures = pictureCaptures,
  createDirectory: prepareDirectory = createDirectory,
  writePicture = writeFile,
}: CaptureOptions): Promise<string[]> {
  await prepareDirectory(directory)
  const stems: string[] = []
  for (const capture of captures) {
    const view = marketingPictures[capture.key][capture.layout]
    for (const scheme of pictureSchemes) {
      const file = `index.${capture.layout}${scheme === 'dark' ? '.dark' : ''}.html`
      const page = await openPage({
        ...screenSizes[view.screen],
        mobile: view.screen === 'mobile',
      })
      try {
        await page.goto(
          `${origin}/static/mokly-generated/${capturePagePath(capture.key)}/${file}`,
        )
        const bounds = { x: 0, y: 0, ...capture.size }
        const stem = parse(pictureFileName(capture, scheme)).name
        await writePicture(
          join(directory, `${stem}.png`),
          await page.screenshot(bounds),
        )
        stems.push(stem)
        console.log(
          `Captured ${stem}: ${bounds.width * 2} × ${bounds.height * 2} px`,
        )
      } finally {
        await page.close()
      }
    }
  }
  return stems
}
