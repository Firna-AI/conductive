// @vitest-environment happy-dom
import { act, type ReactNode } from 'react'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mount, type Mounted } from '../../test-support/mount'
import {
  KeptScroll,
  useKeptScroll,
  type KeptScrollTab,
  type ScrollOffset,
} from './kept-scroll'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A scroll box of a view, as a code, preview, or diff view draws it. */
function View(props: { view: string }) {
  const box = useKeptScroll(props.view)
  return (
    <div data-view={props.view} ref={box}>
      <p>Content</p>
    </div>
  )
}

/** The px that the content of each box passes it sideways. */
const width = 400

/**
 * Lays out each scroll box with `range` px to scroll down and `width` px to
 * scroll sideways, as a browser keeps a scroll position between 0 and the
 * size that the content passes the box. `grow` gives the content a new
 * range down and calls the size observers.
 */
function layOut(range: number) {
  const sideways = new WeakMap<Element, number>()
  const positions = new WeakMap<Element, number>()
  const observers = new Set<() => void>()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private readonly call: () => void
      constructor(callback: () => void) {
        this.call = () => callback()
        observers.add(this.call)
      }
      observe() {}
      disconnect() {
        observers.delete(this.call)
      }
    },
  )
  const axes = [
    ['scrollTop', positions, () => range],
    ['scrollLeft', sideways, () => width],
  ] as const
  for (const [name, offsets, size] of axes) {
    const saved = Object.getOwnPropertyDescriptor(Element.prototype, name)
    if (!saved) throw new Error(`happy-dom has no ${name}`)
    Object.defineProperty(Element.prototype, name, {
      configurable: true,
      get(this: Element) {
        return offsets.get(this) ?? 0
      },
      set(this: Element, value: number) {
        offsets.set(this, Math.min(size(), Math.max(0, value)))
      },
    })
    onTestFinished(() => {
      Object.defineProperty(Element.prototype, name, saved)
    })
  }
  return {
    grow: (next: number) =>
      act(async () => {
        range = next
        for (const call of observers) call()
      }),
  }
}

const places = new Map<string, ScrollOffset>()
const tabOf = (tab: string): KeptScrollTab => ({ places, tab })

/** Shows `view` of `tab`, as the centre shows a file or diff tab. */
function show(view: string, tab: KeptScrollTab | null): ReactNode {
  return (
    <KeptScroll.Provider value={tab}>
      <View key={`${tab?.tab}:${view}`} view={view} />
    </KeptScroll.Provider>
  )
}

const boxOf = (mounted: Mounted) => {
  const box = mounted.container.querySelector('[data-view]')
  if (!(box instanceof HTMLElement)) throw new Error('No scroll box')
  return box
}

/** Scrolls the box as the reader does. */
function read(box: HTMLElement, top: number, left = 0) {
  box.dispatchEvent(new Event('wheel'))
  box.scrollTop = top
  box.scrollLeft = left
  box.dispatchEvent(new Event('scroll'))
}

/** Where the box shows now, down and sideways. */
const offsetOf = (box: HTMLElement) => ({
  top: box.scrollTop,
  left: box.scrollLeft,
})

describe('the scroll offset of a file or diff tab', () => {
  it('gives each tab and each view its own offset back, down and sideways, and starts a new one at the top', async () => {
    places.clear()
    layOut(1000)
    const [readme, diff] = [tabOf('file:README.md'), tabOf('diff:app.ts')]
    const page = await mount(show('preview', readme))
    read(boxOf(page), 300)

    await page.rerender(show('diff', diff))
    expect(offsetOf(boxOf(page))).toEqual({ top: 0, left: 0 })
    read(boxOf(page), 120, 80)

    await page.rerender(show('code', readme))
    expect(offsetOf(boxOf(page))).toEqual({ top: 0, left: 0 })
    await page.rerender(show('preview', readme))
    expect(offsetOf(boxOf(page))).toEqual({ top: 300, left: 0 })
    await page.rerender(show('diff', diff))
    expect(offsetOf(boxOf(page))).toEqual({ top: 120, left: 80 })
  })

  it('waits for content that grows after the mount, and keeps no offset of the short box', async () => {
    places.clear()
    const layout = layOut(1000)
    const readme = tabOf('file:README.md')
    const page = await mount(show('preview', readme))
    read(boxOf(page), 600)
    await page.rerender(show('preview', null))

    await layout.grow(200)
    await page.rerender(show('preview', readme))
    expect(boxOf(page).scrollTop).toBe(200)
    boxOf(page).dispatchEvent(new Event('scroll'))
    expect(places.get('file:README.md\npreview')).toEqual({ top: 600, left: 0 })

    await layout.grow(1000)
    expect(boxOf(page).scrollTop).toBe(600)
  })

  it('stops the wait when the reader scrolls', async () => {
    places.clear()
    const layout = layOut(1000)
    const readme = tabOf('file:README.md')
    const page = await mount(show('preview', readme))
    read(boxOf(page), 600)
    await page.rerender(show('preview', null))

    await layout.grow(200)
    await page.rerender(show('preview', readme))
    read(boxOf(page), 50)
    await layout.grow(1000)
    expect(boxOf(page).scrollTop).toBe(50)
    expect(places.get('file:README.md\npreview')).toEqual({ top: 50, left: 0 })
  })
})
