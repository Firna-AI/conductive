import { Buffer } from 'node:buffer'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'
import { paths } from '../../docs/mockups/src/paths'
import { capturePreview } from '../../tools/marketing-pictures/capture-preview'
import type { Browser } from '../../tools/marketing-pictures/cdp'
import {
  openPage,
  type Clip,
  type Viewport,
} from '../../tools/marketing-pictures/page'

type CapturedPage = {
  viewport: Viewport
  scale: number
  url: string
  content: string
  clips: Clip[]
}

function captureHarness() {
  const pages: CapturedPage[] = []
  const closed: string[] = []
  const saved = new Map<string, Buffer>()
  const output = join('pictures', 'link-preview.png')
  const captureError = new Error('Preview capture failed')
  let failComposition = false
  return {
    pages,
    closed,
    saved,
    output,
    failComposition() {
      failComposition = true
    },
    options: {
      origin: 'https://mockups.test',
      path: output,
      async readAsset(path: URL) {
        return Buffer.from(path.pathname)
      },
      async writePicture(path: string, picture: Buffer) {
        saved.set(path, picture)
      },
      async openPage(viewport: Viewport, scale = 2) {
        const page: CapturedPage = {
          viewport,
          scale,
          url: '',
          content: '',
          clips: [],
        }
        pages.push(page)
        const source = viewport.width === 1440
        return {
          async goto(url: string) {
            page.url = url
          },
          async setContent(html: string) {
            page.content = html
          },
          async screenshot(clip: Clip) {
            page.clips.push(clip)
            if (!source && failComposition) throw captureError
            return Buffer.from(source ? 'current workspace' : 'share preview')
          },
          async close() {
            closed.push(source ? 'workspace' : 'composition')
          },
        }
      },
    },
  }
}

it('captures the current dark workspace into the approved share composition', async () => {
  const harness = captureHarness()
  await capturePreview(harness.options)

  expect(harness.saved.get(harness.output)?.toString()).toBe('share preview')
  expect(harness.pages[0]).toEqual({
    viewport: { width: 1440, height: 547, mobile: false },
    scale: 2,
    url: `https://mockups.test/static/mokly-generated/${paths.app}/index.desktop.dark.html`,
    content: '',
    clips: [{ x: 0, y: 0, width: 1440, height: 547 }],
  })
  const composition = harness.pages[1]
  expect(composition).toMatchObject({
    viewport: { width: 1200, height: 630, mobile: false },
    scale: 1,
    clips: [{ x: 0, y: 0, width: 1200, height: 630 }],
  })
  expect(composition.content).toContain(
    'data:image/png;base64,Y3VycmVudCB3b3Jrc3BhY2U=',
  )
  expect(composition.content).toContain(
    'Give every coding task its own cloud computer.',
  )
  expect(composition.url).toBe('')
  expect(harness.closed).toEqual(['workspace', 'composition'])
})

it('closes the workspace and composition pages when the preview capture fails', async () => {
  const harness = captureHarness()
  harness.failComposition()

  await expect(capturePreview(harness.options)).rejects.toThrow(
    'Preview capture failed',
  )
  expect(harness.closed).toEqual(['workspace', 'composition'])
  expect(harness.saved.size).toBe(0)
})

it('sets the owned document content and waits for images and fonts before capture', async () => {
  const calls: { method: string; params: Record<string, unknown> }[] = []
  const events: string[] = []
  const image = {
    loading: 'lazy',
    async decode() {
      events.push('image')
    },
  }
  const browser: Browser = {
    async send(method, params = {}) {
      calls.push({ method, params })
      if (method === 'Target.createTarget') return { targetId: 'target' }
      if (method === 'Target.attachToTarget') return { sessionId: 'session' }
      if (method === 'Page.getFrameTree')
        return { frameTree: { frame: { id: 'main-frame' } } }
      if (method === 'Page.setDocumentContent') events.push('document')
      if (method !== 'Runtime.evaluate') return {}
      const value: unknown = await runInNewContext(String(params.expression), {
        document: {
          images: [image],
          fonts: {
            get ready() {
              events.push('font')
              return Promise.resolve()
            },
          },
          getAnimations: () => [],
        },
        requestAnimationFrame(callback: () => void) {
          events.push('frame')
          callback()
        },
      })
      return { result: { value } }
    },
    async waitFor() {},
    async close() {},
  }
  const page = await openPage(
    browser,
    { width: 1200, height: 630, mobile: false },
    1,
  )
  const html = '<!doctype html><html><body>Owned share document</body></html>'

  await page.setContent(html)

  expect(calls).toContainEqual({
    method: 'Page.setDocumentContent',
    params: { frameId: 'main-frame', html },
  })
  expect(calls.some(({ method }) => method === 'Page.navigate')).toBe(false)
  expect(image.loading).toBe('eager')
  expect(events).toEqual(['document', 'font', 'image', 'frame', 'frame'])
})
