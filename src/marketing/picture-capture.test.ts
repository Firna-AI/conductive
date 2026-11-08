import { Buffer } from 'node:buffer'
import { join, parse } from 'node:path'
import { expect, it } from 'vitest'
import {
  capturePagePath,
  pictureFileName,
  type PictureCapture,
  type PictureScheme,
} from '../../docs/mockups/src/screens/marketingPictureList'
import { capturePictures } from '../../tools/marketing-pictures/capture-pictures'

function filePath(capture: PictureCapture, scheme: PictureScheme): string {
  return join('captures', `${parse(pictureFileName(capture, scheme)).name}.png`)
}

function viewUrl(capture: PictureCapture, scheme: PictureScheme): string {
  const suffix = scheme === 'dark' ? '.dark' : ''
  return `https://mockups.test/static/mokly-generated/${capturePagePath(capture.key)}/index.${capture.layout}${suffix}.html`
}

it('uses source viewports and keeps each reordered capture with its filename', async () => {
  const review: PictureCapture = {
    key: 'review',
    layout: 'desktop',
    layouts: ['desktop'],
    stem: 'review-desktop',
    size: { width: 80, height: 48 },
  }
  const hero: PictureCapture = {
    key: 'hero',
    layout: 'desktop',
    layouts: ['desktop'],
    stem: 'hero-desktop',
    size: { width: 50, height: 40 },
  }
  const saved = new Map<string, unknown>()
  const closed: string[] = []
  await capturePictures({
    origin: 'https://mockups.test',
    directory: 'captures',
    captures: [review, hero],
    createDirectory: async () => {},
    async writePicture(path, bytes) {
      const capture: unknown = JSON.parse(bytes.toString())
      saved.set(path, capture)
    },
    async openPage(viewport) {
      let url = ''
      return {
        async goto(address) {
          url = address
        },
        async screenshot(clip) {
          return Buffer.from(JSON.stringify({ url, viewport, clip }))
        },
        async close() {
          closed.push(url)
        },
      }
    },
  })

  expect(saved.size).toBe(4)
  expect(saved.get(filePath(review, 'light'))).toEqual({
    url: viewUrl(review, 'light'),
    viewport: { width: 1440, height: 900, mobile: false },
    clip: { x: 0, y: 0, width: 80, height: 48 },
  })
  expect(saved.get(filePath(hero, 'light'))).toEqual({
    url: viewUrl(hero, 'light'),
    viewport: { width: 1440, height: 900, mobile: false },
    clip: { x: 0, y: 0, width: 50, height: 40 },
  })
  expect(closed).toEqual([
    viewUrl(review, 'light'),
    viewUrl(review, 'dark'),
    viewUrl(hero, 'light'),
    viewUrl(hero, 'dark'),
  ])
})
