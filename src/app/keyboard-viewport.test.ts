import { expect, test } from 'vitest'
import { followKeyboard, type KeyboardWindow } from './keyboard-viewport'

/** A visual viewport that a test resizes, scrolls, and zooms. */
class FakeViewport extends EventTarget {
  height = 800
  offsetTop = 0
  scale = 1

  change(next: { height?: number; offsetTop?: number; scale?: number }) {
    Object.assign(this, next)
    this.dispatchEvent(new Event('resize'))
  }
}

/** A phone window 800 px tall, with the page at its top. */
function phone() {
  const viewport = new FakeViewport()
  const properties = new Map<string, string>()
  const scrolls: number[] = []
  const win: KeyboardWindow & { scrollY: number } = {
    visualViewport: viewport,
    scrollY: 0,
    scrollTo(_x: number, y: number) {
      scrolls.push(y)
      win.scrollY = y
      viewport.offsetTop = y
    },
    document: {
      documentElement: {
        clientHeight: 800,
        style: {
          setProperty: (name: string, value: string | null) => {
            properties.set(name, value ?? '')
          },
          removeProperty: (name: string) => {
            const old = properties.get(name) ?? ''
            properties.delete(name)
            return old
          },
        },
      },
    },
  }
  const height = () => properties.get('--ui-screen-height')
  return { win, viewport, scrolls, height }
}

test('the app ends at the keyboard and stays at the top of the page while the keyboard shows', () => {
  const { win, viewport, scrolls, height } = phone()
  const stop = followKeyboard(win)
  expect(height()).toBeUndefined()

  // Safari scrolls the page up to show the focused field.
  win.scrollY = 300
  viewport.change({ height: 450, offsetTop: 300 })
  expect(height()).toBe('450px')
  expect(scrolls).toEqual([0])

  // The keyboard goes, and the page takes the full window again.
  viewport.change({ height: 800 })
  expect(height()).toBeUndefined()

  viewport.change({ height: 450 })
  stop()
  expect(height()).toBeUndefined()
})

test('a pinch zoom keeps the height of the page and its scroll', () => {
  const { win, viewport, scrolls, height } = phone()
  followKeyboard(win)
  win.scrollY = 120
  viewport.change({ height: 400, offsetTop: 120, scale: 2 })
  expect(height()).toBeUndefined()
  expect(scrolls).toEqual([])
})
