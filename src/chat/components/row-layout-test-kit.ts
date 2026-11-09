import { act } from 'react'
import { onTestFinished, vi } from 'vitest'

// A browser layout of the tab row for the tests that mount the chat:
// happy-dom lays out nothing, and its ResizeObserver never calls back.

/** The height of the row and of its tabs, in CSS px. */
const height = 30

/**
 * The most rounds of callbacks of one `settle`. A callback here changes no
 * size, so one round settles the row, and more rounds show a loop.
 */
const settleRounds = 4

/** Whether the element is the list of the tab row, which scrolls sideways. */
function isRow(node: Element): boolean {
  return node.matches('nav[aria-label="Sessions and files"] > ul')
}

/** Replaces a property of a prototype until the test ends. */
function replace(
  prototype: object,
  name: string,
  descriptor: PropertyDescriptor,
): PropertyDescriptor {
  const saved = Object.getOwnPropertyDescriptor(prototype, name)
  if (!saved) throw new Error(`happy-dom has no ${name} to replace.`)
  Object.defineProperty(prototype, name, { configurable: true, ...descriptor })
  onTestFinished(() => {
    Object.defineProperty(prototype, name, saved)
  })
  return saved
}

/** What a browser gives an observer for a box whose size changed. */
function entryOf(target: Element, box: DOMRect): ResizeObserverEntry {
  const size = { inlineSize: box.width, blockSize: box.height }
  return {
    target,
    contentRect: box,
    borderBoxSize: [size],
    contentBoxSize: [size],
    devicePixelContentBoxSize: [size],
  }
}

/**
 * A `ResizeObserver` that calls back when `notify` finds a box that changed
 * its size. A browser calls back at the start only for a box that is not
 * 0 by 0 px, so the boxes that happy-dom lays out at 0 never call back.
 */
class SettledObserver implements ResizeObserver {
  private readonly sizes = new Map<Element, string>()
  private readonly callback: ResizeObserverCallback
  private readonly all: Set<SettledObserver>

  constructor(callback: ResizeObserverCallback, all: Set<SettledObserver>) {
    this.callback = callback
    this.all = all
    all.add(this)
  }

  observe(target: Element): void {
    this.sizes.set(target, '0x0')
  }

  unobserve(target: Element): void {
    this.sizes.delete(target)
  }

  disconnect(): void {
    this.sizes.clear()
    this.all.delete(this)
  }

  /** Calls back with each box whose size changed, and says if one did. */
  notify(): boolean {
    const entries: ResizeObserverEntry[] = []
    for (const [target, last] of this.sizes) {
      const box = target.getBoundingClientRect()
      const size = `${box.width}x${box.height}`
      if (size === last) continue
      this.sizes.set(target, size)
      entries.push(entryOf(target, box))
    }
    if (entries.length > 0) this.callback(entries, this)
    return entries.length > 0
  }
}

/**
 * The layout of the tab row, as a browser makes it. The row starts at the
 * left side of the window and is `width` CSS px wide. Its list items sit
 * side by side with no gap, each as wide as `widthOf` gives, and a drop
 * line takes no width. The row scrolls them, and it keeps its scroll
 * position inside them, as a browser does. A browser calls back each
 * `ResizeObserver` after a layout that changed the size of a box that it
 * observes, and `settle` does that here. Make the layout before the chat
 * mounts, so that the first render of the row finds it. It holds until the
 * test ends.
 */
export class RowLayout {
  /** The width of the row, in CSS px. Set it to resize the row. */
  width: number
  private readonly widthOf: (item: Element) => number
  private scrolled = 0
  private readonly observers = new Set<SettledObserver>()

  constructor(width: number, widthOf: (item: Element) => number) {
    this.width = width
    this.widthOf = widthOf
    this.install()
  }

  /**
   * Calls back each observer of a box that changed its size, as a browser
   * does after a layout, until the sizes hold.
   */
  settle(): void {
    act(() => {
      for (let round = 0; round < settleRounds; round += 1) {
        const called = [...this.observers].map((observer) => observer.notify())
        if (!called.includes(true)) return
      }
      throw new Error('The sizes of the tab row did not settle.')
    })
  }

  /** The list items of the row, each with its start and its width. */
  private items(row: Element) {
    let start = 0
    return Array.from(row.children, (item) => {
      const hidden = item.getAttribute('aria-hidden') === 'true'
      const width = hidden ? 0 : this.widthOf(item)
      const placed = { item, start, width }
      start += width
      return placed
    })
  }

  /** The width of what the row holds, at least the width of the row. */
  private contentOf(row: Element): number {
    const items = this.items(row)
    return Math.max(
      this.width,
      ...items.map(({ start, width }) => start + width),
    )
  }

  /** The scroll position, which a browser keeps inside the content. */
  private leftOf(row: Element): number {
    const max = this.contentOf(row) - this.width
    this.scrolled = Math.min(Math.max(this.scrolled, 0), max)
    return this.scrolled
  }

  /** The box of the row or of one of its list items, else null. */
  private boxOf(node: Element): DOMRect | null {
    if (isRow(node)) return new DOMRect(0, 0, this.width, height)
    const row = node.parentElement
    if (!row || !isRow(row)) return null
    const placed = this.items(row).find(({ item }) => item === node)
    if (!placed) return null
    return new DOMRect(placed.start - this.leftOf(row), 0, placed.width, height)
  }

  /**
   * Scrolls the row as a browser does: inside the content, with a scroll
   * event when the position changes.
   */
  private scrollTo(row: Element, value: number): void {
    const last = this.leftOf(row)
    this.scrolled = value
    if (this.leftOf(row) !== last) row.dispatchEvent(new Event('scroll'))
  }

  /** Gives the row, its list items, and the observers their browser parts. */
  private install(): void {
    const boxOf = (node: Element) => this.boxOf(node)
    const rowWidth = () => this.width
    const contentOf = (row: Element) => this.contentOf(row)
    const leftOf = (row: Element) => this.leftOf(row)
    const scrollTo = (row: Element, value: number) => this.scrollTo(row, value)
    const box = replace(Element.prototype, 'getBoundingClientRect', {
      value(this: Element) {
        return boxOf(this) ?? box.value.call(this)
      },
    })
    const clientWidth = replace(HTMLElement.prototype, 'clientWidth', {
      get(this: HTMLElement) {
        return isRow(this) ? rowWidth() : clientWidth.get?.call(this)
      },
    })
    const scrollWidth = replace(Element.prototype, 'scrollWidth', {
      get(this: Element) {
        return isRow(this) ? contentOf(this) : scrollWidth.get?.call(this)
      },
    })
    const scrollLeft = replace(Element.prototype, 'scrollLeft', {
      get(this: Element) {
        return isRow(this) ? leftOf(this) : scrollLeft.get?.call(this)
      },
      set(this: Element, value: number) {
        if (isRow(this)) scrollTo(this, value)
        else scrollLeft.set?.call(this, value)
      },
    })
    const all = this.observers
    vi.stubGlobal(
      'ResizeObserver',
      class extends SettledObserver {
        constructor(callback: ResizeObserverCallback) {
          super(callback, all)
        }
      },
    )
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
  }
}

/**
 * The width of each list item of the row from its text, for `RowLayout`. A
 * tab with its rename field has no text.
 */
export function widthsByText(
  widths: Readonly<Record<string, number>>,
): (item: Element) => number {
  return (item) => {
    const width = widths[item.textContent ?? '']
    if (width === undefined) {
      throw new Error(`The test gives no width to "${item.textContent}".`)
    }
    return width
  }
}
