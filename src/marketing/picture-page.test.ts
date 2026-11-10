import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'
import type { Browser } from '../../tools/marketing-pictures/cdp'
import { openPage } from '../../tools/marketing-pictures/page'

/** The timeline of the clock of a page, as `document.timeline` is. */
class DocumentTimeline {}

/** A timeline that the scroll position of an element drives. */
class ScrollTimeline {}

/** An animation that the clock drives, part way through its run. */
function clockAnimation() {
  return {
    timeline: new DocumentTimeline(),
    playing: true,
    currentTime: 1250,
    pause() {
      this.playing = false
    },
  }
}

/** An animation that scrolling drives. Chrome rejects a time value for it. */
function scrollAnimation() {
  const animation = { timeline: new ScrollTimeline(), pause() {} }
  Object.defineProperty(animation, 'currentTime', {
    set() {
      throw new TypeError('Invalid currentTime')
    },
  })
  return animation
}

/**
 * A browser whose page runs each script with `globals`, and reports a
 * thrown error as DevTools does.
 */
function fakeBrowser(globals: Record<string, unknown>): Browser {
  return {
    async send(method, params = {}) {
      if (method === 'Target.createTarget') return { targetId: 'target' }
      if (method === 'Target.attachToTarget') return { sessionId: 'session' }
      if (method !== 'Runtime.evaluate') return {}
      try {
        const value: unknown = await runInNewContext(
          String(params.expression),
          globals,
        )
        return { result: { value } }
      } catch (error) {
        return { exceptionDetails: { text: String(error) } }
      }
    },
    async waitFor() {},
    async close() {},
  }
}

it('freezes clock animations at their start and leaves scroll-driven ones', async () => {
  const clock = clockAnimation()
  const browser = fakeBrowser({
    DocumentTimeline,
    document: {
      images: [],
      fonts: { ready: Promise.resolve() },
      getAnimations: () => [clock, scrollAnimation()],
    },
    requestAnimationFrame: (callback: () => void) => callback(),
  })
  const page = await openPage(browser, {
    width: 1440,
    height: 900,
    mobile: false,
  })

  await expect(page.goto('https://mockups.test/capture.html')).resolves.toBe(
    undefined,
  )
  expect(clock).toMatchObject({ playing: false, currentTime: 0 })
})
