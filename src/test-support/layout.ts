import { afterEach } from 'vitest'

/** A size in CSS pixels. */
export interface Size {
  readonly width: number
  readonly height: number
}

/** An element that a stand-in observer watches, and the size it reported. */
interface Observation {
  readonly target: Element
  reported: Size
}

const restores: (() => void)[] = []

afterEach(() => {
  for (const restore of restores.splice(0)) restore()
})

/** Puts `descriptor` in place of the property `name` until the test ends. */
function replace(
  owner: object,
  name: string,
  descriptor: PropertyDescriptor,
): void {
  const saved = Object.getOwnPropertyDescriptor(owner, name)
  Object.defineProperty(owner, name, { configurable: true, ...descriptor })
  restores.push(() => {
    if (saved) Object.defineProperty(owner, name, saved)
    else Reflect.deleteProperty(owner, name)
  })
}

/** The descriptor of `name` on `owner`, or else on its nearest prototype. */
function inherited(
  owner: object,
  name: string,
): PropertyDescriptor | undefined {
  for (
    let each: object | null = owner;
    each;
    each = Object.getPrototypeOf(each)
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(each, name)
    if (descriptor) return descriptor
  }
  return undefined
}

function entry(target: Element, size: Size): ResizeObserverEntry {
  const box = { inlineSize: size.width, blockSize: size.height }
  return {
    target,
    contentRect: new DOMRectReadOnly(0, 0, size.width, size.height),
    borderBoxSize: [box],
    contentBoxSize: [box],
    devicePixelContentBoxSize: [box],
  }
}

/**
 * happy-dom lays out nothing: each element measures 0 × 0, and a
 * `ResizeObserver` never calls back. Until the test ends, this lays out
 * each element that matches `selector` as a browser does under the
 * `[hidden]` rule of the app. Its `clientWidth` and `clientHeight` give
 * `size` while it is in the document and no `hidden` ancestor hides it,
 * and 0 otherwise. Each `ResizeObserver` calls back when it starts to
 * observe such an element with a size, and after each change of a `hidden`
 * attribute or of the document that changes the size of an element that
 * it observes.
 */
export function layOut(selector: string, size: Size): void {
  const none: Size = { width: 0, height: 0 }
  const measure = (element: Element): Size =>
    element.matches(selector) &&
    element.isConnected &&
    element.closest('[hidden]') === null
      ? size
      : none
  const sides = { clientWidth: 'width', clientHeight: 'height' } as const
  for (const [name, side] of Object.entries(sides)) {
    // Another element keeps the size of happy-dom, which is 0.
    const fallback = inherited(HTMLElement.prototype, name)
    replace(HTMLElement.prototype, name, {
      get(this: HTMLElement): unknown {
        if (this.matches(selector)) return measure(this)[side]
        return fallback?.get?.call(this) ?? 0
      },
    })
  }

  const observers = new Set<StandIn>()
  class StandIn implements ResizeObserver {
    private readonly callback: ResizeObserverCallback
    private readonly observations: Observation[] = []

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }

    observe(target: Element): void {
      if (this.observations.some((each) => each.target === target)) return
      this.observations.push({ target, reported: none })
      observers.add(this)
      queueMicrotask(() => this.check())
    }

    unobserve(target: Element): void {
      const index = this.observations.findIndex(
        (each) => each.target === target,
      )
      if (index >= 0) this.observations.splice(index, 1)
    }

    disconnect(): void {
      this.observations.length = 0
      observers.delete(this)
    }

    /** Calls back with each observed element whose size changed. */
    check(): void {
      const entries: ResizeObserverEntry[] = []
      for (const observation of this.observations) {
        const now = measure(observation.target)
        const { reported } = observation
        if (now.width === reported.width && now.height === reported.height)
          continue
        observation.reported = now
        entries.push(entry(observation.target, now))
      }
      if (entries.length > 0) this.callback(entries, this)
    }
  }
  replace(globalThis, 'ResizeObserver', { writable: true, value: StandIn })

  const changes = new MutationObserver(() => {
    for (const observer of [...observers]) observer.check()
  })
  changes.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['hidden'],
  })
  restores.push(() => changes.disconnect())
}
