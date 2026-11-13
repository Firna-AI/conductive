// @vitest-environment happy-dom
import { act, type ReactNode } from 'react'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mount, type Mounted } from '../../test-support/mount'
import { KeptScroll, useKeptScroll, type KeptScrollTab } from './kept-scroll'

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

/**
 * Lays out each scroll box with `range` px to scroll, as a browser keeps a
 * scroll position between 0 and the height that the content passes the box.
 * `grow` gives the content a new range and calls the size observers.
 */
function layOut(range: number) {
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
  const saved = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')
  if (!saved) throw new Error('happy-dom has no scrollTop')
  Object.defineProperty(Element.prototype, 'scrollTop', {
    configurable: true,
    get(this: Element) {
      return positions.get(this) ?? 0
    },
    set(this: Element, value: number) {
      positions.set(this, Math.min(range, Math.max(0, value)))
    },
  })
  onTestFinished(() => {
    Object.defineProperty(Element.prototype, 'scrollTop', saved)
  })
  return {
    grow: (next: number) =>
      act(async () => {
        range = next
        for (const call of observers) call()
      }),
  }
}

const places = new Map<string, number>()
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
function read(box: HTMLElement, top: number) {
  box.dispatchEvent(new Event('wheel'))
  box.scrollTop = top
  box.dispatchEvent(new Event('scroll'))
}

describe('the scroll offset of a file or diff tab', () => {
  it('gives each tab and each view its own offset back, and starts a new one at the top', async () => {
    places.clear()
    layOut(1000)
    const [readme, diff] = [tabOf('file:README.md'), tabOf('diff:app.ts')]
    const page = await mount(show('preview', readme))
    read(boxOf(page), 300)

    await page.rerender(show('diff', diff))
    expect(boxOf(page).scrollTop).toBe(0)
    read(boxOf(page), 120)

    await page.rerender(show('code', readme))
    expect(boxOf(page).scrollTop).toBe(0)
    await page.rerender(show('preview', readme))
    expect(boxOf(page).scrollTop).toBe(300)
    await page.rerender(show('diff', diff))
    expect(boxOf(page).scrollTop).toBe(120)
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
    expect(places.get('file:README.md\npreview')).toBe(600)

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
    expect(places.get('file:README.md\npreview')).toBe(50)
  })
})
