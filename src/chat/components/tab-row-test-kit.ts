import { act } from 'react'
import {
  accessibleName,
  byLabel,
  queryByRole,
} from '../../test-support/dom-queries'

// The inputs that the tests send to the tab row of the mounted chat: right
// clicks, keys, and wheel turns, and what the row shows back.

/** Sends an event, and says whether the browser may still act on it. */
export function allowed(target: EventTarget, event: Event): boolean {
  act(() => {
    target.dispatchEvent(event)
  })
  return !event.defaultPrevented
}

/** Sends a right click, and says whether the browser may show its own menu. */
export function rightClick(target: EventTarget, init: MouseEventInit = {}) {
  return allowed(
    target,
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      ...init,
    }),
  )
}

/** Presses a key, and says whether the browser may act on its key down. */
export function pressOn(
  target: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
): boolean {
  const event = { key, bubbles: true, cancelable: true, ...init }
  const free = allowed(target, new KeyboardEvent('keydown', event))
  allowed(target, new KeyboardEvent('keyup', event))
  return free
}

/** Turns the wheel, and says whether the browser may still scroll with it. */
export function turnWheel(target: EventTarget, init: WheelEventInit): boolean {
  return allowed(
    target,
    new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init }),
  )
}

/**
 * The items of the open menu with this label, by their names, each with
 * whether it is off. Empty while no such menu shows.
 */
export function menuItems(label: string): { name: string; off: boolean }[] {
  const menu = queryByRole('menu', label)
  if (!menu) return []
  return Array.from(menu.querySelectorAll('[role="menuitem"]'), (item) => ({
    name: accessibleName(item),
    off: item.matches(':disabled, [aria-disabled="true"]'),
  }))
}

/** The accessible name of the element with the focus, if any. */
export function focused(): string | null {
  const active = document.activeElement
  return active && active !== document.body ? accessibleName(active) : null
}

/** The list of the tab row, which scrolls sideways. */
export function tabList(): HTMLElement {
  const list = byLabel('Sessions and files').querySelector('ul')
  if (!list) throw new Error('The tab row has no list.')
  return list
}

/**
 * Gives the list the width and the scroll width of a full row, which
 * happy-dom does not lay out, and keeps its scroll position inside them, as
 * a browser does. Each scroll by script sends the scroll event of a
 * browser, which happy-dom does not send.
 */
export function fillRow(list: HTMLElement, width: number, content: number) {
  let left = 0
  Object.defineProperties(list, {
    clientWidth: { configurable: true, value: width },
    scrollWidth: { configurable: true, value: content },
    scrollLeft: {
      configurable: true,
      get: () => left,
      set: (value: number) => {
        left = Math.min(Math.max(value, 0), content - width)
        list.dispatchEvent(new Event('scroll'))
      },
    },
  })
}
