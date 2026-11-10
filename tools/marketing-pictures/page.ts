import { object, string, type Browser } from './cdp.ts'

export type Clip = { x: number; y: number; width: number; height: number }
export type Viewport = { width: number; height: number; mobile: boolean }

/**
 * Open a page at two device pixels per CSS pixel, with the animations of the
 * clock stopped.
 */
export async function openPage(browser: Browser, viewport: Viewport) {
  const targetId = string(
    (await browser.send('Target.createTarget', { url: 'about:blank' }))
      .targetId,
  )
  try {
    const sessionId = string(
      (await browser.send('Target.attachToTarget', { targetId, flatten: true }))
        .sessionId,
    )
    const send = (method: string, params: Record<string, unknown> = {}) =>
      browser.send(method, params, sessionId)
    await send('Page.enable')
    await send('Runtime.enable')
    await send('Animation.enable')
    await send('Animation.setPlaybackRate', { playbackRate: 0 })
    await send('Emulation.setDeviceMetricsOverride', {
      ...viewport,
      deviceScaleFactor: 2,
    })

    async function evaluate(expression: string): Promise<unknown> {
      const result = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      })
      if (result.exceptionDetails)
        throw new Error(JSON.stringify(result.exceptionDetails))
      return object(result.result).value
    }

    return {
      evaluate,
      async goto(url: string) {
        const loaded = browser.waitFor('Page.loadEventFired', sessionId)
        const [, result] = await Promise.all([
          loaded,
          send('Page.navigate', { url }),
        ])
        if (result.errorText) throw new Error(string(result.errorText))
        await evaluate(`(async () => {
          for (const image of document.images) image.loading = 'eager'
          await document.fonts.ready
          await Promise.all([...document.images].map((image) => image.decode()))
          // Reset each animation of the clock to the same phase, including
          // negative delays. Scrolling drives the other animations, so they
          // keep the state of the scroll and take no time value.
          for (const animation of document.getAnimations()) {
            if (!(animation.timeline instanceof DocumentTimeline)) continue
            animation.pause()
            animation.currentTime = 0
          }
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        })()`)
      },
      async screenshot(clip: Clip): Promise<Buffer> {
        const { data } = await send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
          fromSurface: true,
          clip: { ...clip, scale: 1 },
        })
        return Buffer.from(string(data), 'base64')
      },
      async close() {
        await browser.send('Target.closeTarget', { targetId })
      },
    }
  } catch (error) {
    await browser.send('Target.closeTarget', { targetId })
    throw error
  }
}

export type Page = Awaited<ReturnType<typeof openPage>>
