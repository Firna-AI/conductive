import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { object, type Browser } from './cdp.ts'
import { openPage, type Clip } from './page.ts'

// The page order comes from MarketingScreen and marketingFeatures.
const names = [
  'hero',
  'starting',
  'agents',
  'review',
  'tools',
  'org',
  'phone',
] as const
const layouts = [
  { layout: 'desktop', width: 1440, mobile: false },
  { layout: 'mobile', width: 390, mobile: true },
] as const

const prepareFrames = `(async () => {
  const frames = [...document.querySelectorAll('[role=img]')]
    .filter((element) => element.querySelector('[inert]'))
  for (const frame of frames) {
    // Let the stage grow when a picture is taller than its visible stage.
    for (let element = frame.parentElement; element && element !== document.body;
      element = element.parentElement) {
      const style = getComputedStyle(element)
      if (style.overflow !== 'visible') element.style.overflow = 'visible'
      if (style.height !== 'auto' && element.tagName === 'DIV') element.style.height = 'auto'
    }
    const view = frame.querySelector('[inert]').parentElement
    view.style.borderRadius = '0'
    view.style.boxShadow = 'none'
    if (view !== frame) view.parentElement.style.borderRadius = '0'
  }
  // Reset every CSS animation to the same phase, including negative delays.
  for (const animation of document.getAnimations()) {
    animation.pause()
    animation.currentTime = 0
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  return frames.map((frame) => {
    const view = frame.querySelector('[inert]').parentElement
    const rect = view.getBoundingClientRect()
    const border = parseFloat(getComputedStyle(view).borderTopWidth)
    return { x: rect.x + scrollX + border, y: rect.y + scrollY + border,
      width: rect.width - 2 * border, height: rect.height - 2 * border }
  })
})()`

function clip(value: unknown): Clip {
  const { x, y, width, height } = object(value)
  if (
    typeof x !== 'number' ||
    !Number.isFinite(x) ||
    typeof y !== 'number' ||
    !Number.isFinite(y) ||
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new Error('Invalid picture bounds from the marketing mockup')
  }
  // Snap inward to whole device pixels to leave every frame pixel outside.
  const left = Math.ceil(x * 2) / 2
  const top = Math.ceil(y * 2) / 2
  return {
    x: left,
    y: top,
    width: Math.floor((x + width) * 2) / 2 - left,
    height: Math.floor((y + height) * 2) / 2 - top,
  }
}

/** Capture the screen inside each frame, without changing the mockup source. */
export async function capturePictures(
  browser: Browser,
  origin: string,
  directory: string,
): Promise<string[]> {
  await mkdir(directory, { recursive: true })
  const stems: string[] = []
  for (const { layout, width, mobile } of layouts) {
    for (const scheme of ['light', 'dark']) {
      const file = `index.${layout}${scheme === 'dark' ? '.dark' : ''}.html`
      const page = await openPage(browser, { width, height: 900, mobile })
      try {
        await page.goto(`${origin}/static/mokly-generated/marketing/${file}`)
        const boxes = await page.evaluate(prepareFrames)
        if (!Array.isArray(boxes) || boxes.length !== names.length) {
          throw new Error(`${file}: expected ${names.length} picture frames`)
        }
        for (const [index, name] of names.entries()) {
          // Both layouts use the same phone capture.
          if (name === 'phone' && layout === 'mobile') continue
          const bounds = clip(boxes[index])
          const stem =
            name === 'phone'
              ? `${name}-${scheme}`
              : `${name}-${layout}-${scheme}`
          await writeFile(
            join(directory, `${stem}.png`),
            await page.screenshot(bounds),
          )
          stems.push(stem)
          console.log(
            `Captured ${stem}: ${bounds.width * 2} × ${bounds.height * 2} px`,
          )
        }
      } finally {
        await page.close()
      }
    }
  }
  return stems
}
