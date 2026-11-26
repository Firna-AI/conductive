import { expect, test } from 'vitest'
import { followKeyboard, type KeyboardWindow } from './keyboard-viewport'

/**
 * A phone window 800 px tall, with the page at its top. Its visual viewport
 * acts as Safari's does: a change of size sends `resize`, and a move of the
 * page after it sends `scroll`.
 */
function phone() {
  const viewport = Object.assign(new EventTarget(), {
    height: 800,
    offsetTop: 0,
    scale: 1,
  })
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
  const resize = (next: { height: number; scale?: number }) => {
    Object.assign(viewport, next)
    viewport.dispatchEvent(new Event('resize'))
  }
  const scroll = (top: number) => {
    win.scrollY = top
    viewport.offsetTop = top
    viewport.dispatchEvent(new Event('scroll'))
  }
  const height = () => properties.get('--ui-screen-height')
  return { win, resize, scroll, scrolls, height }
}

test('the app ends at the keyboard and stays at the top of the page while the keyboard shows', () => {
  const { win, resize, scroll, scrolls, height } = phone()
  const stop = followKeyboard(win)
  expect(height()).toBeUndefined()

  // The keyboard shows, then Safari scrolls the page to the focused field.
  resize({ height: 450 })
  expect(height()).toBe('450px')
  scroll(300)
  expect(scrolls).toEqual([0])

  // The keyboard goes, and Safari leaves the page scrolled.
  win.scrollY = 120
  resize({ height: 800 })
  expect(height()).toBeUndefined()
  expect(scrolls).toEqual([0, 0])

  resize({ height: 450 })
  stop()
  expect(height()).toBeUndefined()
})

test('a pinch zoom keeps the height of the app and the scroll of the page', () => {
  const { win, resize, scroll, scrolls, height } = phone()
  followKeyboard(win)
  resize({ height: 400, scale: 2 })
  scroll(120)
  expect(height()).toBeUndefined()
  expect(scrolls).toEqual([])

  // A zoom while the keyboard shows keeps the app at the keyboard.
  scroll(0)
  resize({ height: 450, scale: 1 })
  resize({ height: 225, scale: 2 })
  scroll(200)
  expect(height()).toBe('450px')
  expect(scrolls).toEqual([])
})
