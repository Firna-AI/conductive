// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { PanelLayout } from '../../app/panels'
import type { KeyValueStorage } from '../../app/services'
import { MemoryStorage } from '../../app/test-kit'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT, pressKey } from '../../test-support/mount'
import {
  resizeHeightLabel,
  resizeWidthLabel,
} from '../../ui/components/explain/explainCopy'
import popoverStyles from '../../ui/components/explain/ExplainPopover.module.css'
import styles from './explain.module.css'
import { mountChat } from './explain-test-kit'
import { explained, openFromMark } from './popover-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const quote = 'Manual entry still works'
const title = `Explain "${quote}"`

/** Puts `descriptor` in place of the property `name` until the test ends. */
function replace(owner: object, name: string, descriptor: PropertyDescriptor) {
  const saved = Object.getOwnPropertyDescriptor(owner, name)
  Object.defineProperty(owner, name, { configurable: true, ...descriptor })
  onTestFinished(() => {
    if (saved) Object.defineProperty(owner, name, saved)
    else Reflect.deleteProperty(owner, name)
  })
}

/**
 * Lays the popover out as a browser does, until the test ends: the dialog
 * at `panel`, the box of its open mark at `mark`, and its frame, the body,
 * at `frame`. happy-dom lays out nothing, so each other element keeps a box
 * of 0 × 0 px.
 */
function layOutPopover(boxes: {
  panel: DOMRect
  mark: DOMRect
  frame: DOMRect
}) {
  const measure = Element.prototype.getBoundingClientRect
  replace(Element.prototype, 'getBoundingClientRect', {
    value(this: Element): DOMRect {
      if (this.getAttribute('role') === 'dialog') return boxes.panel
      if (this.classList.contains(styles.anchor)) return boxes.mark
      if (this === document.body) return boxes.frame
      return measure.call(this)
    },
  })
  replace(HTMLElement.prototype, 'offsetParent', {
    get(this: HTMLElement): Element | null {
      return this.getAttribute('role') === 'dialog' ? document.body : null
    },
  })
}

/**
 * Lays the popover out as a browser without CSS anchor positioning does,
 * until the test ends: `CSS.supports` denies `position-anchor`, so
 * `placePanel` places the popover. The dialog is as wide as its
 * `--explain-width`, as its CSS makes it, and each other element keeps a
 * width of 0 px.
 */
function withoutAnchorPositioning() {
  // happy-dom makes a new `CSS` at each read, so the change goes on the
  // prototype that they share.
  const shared = Reflect.getPrototypeOf(CSS)
  if (!shared) throw new Error('CSS has no prototype.')
  replace(shared, 'supports', {
    value: (condition: string): boolean =>
      !condition.startsWith('position-anchor'),
  })
  replace(HTMLElement.prototype, 'offsetWidth', {
    get(this: HTMLElement): number {
      return this.getAttribute('role') === 'dialog'
        ? parseFloat(this.style.getPropertyValue('--explain-width'))
        : 0
    },
  })
}

/** The chosen size that the next page load reads from the browser. */
function kept(storage: KeyValueStorage) {
  const { explain } = new PanelLayout(storage)
  return {
    width: explain.width.chosen.get(),
    height: explain.height.chosen.get(),
  }
}

/** Sends a pointer event of the main button to `target` at a point. */
async function pointer(
  target: Element,
  type: string,
  at: { clientX: number; clientY: number },
) {
  await act(async () => {
    target.dispatchEvent(
      new PointerEvent(type, { bubbles: true, cancelable: true, ...at }),
    )
  })
}

describe('the handles of the popover of an explanation', () => {
  it('lie on its free edges after its follow-up field on a computer, and the sheet of a phone has none', async () => {
    const { events } = explained('explain-1', quote)
    const { view } = await mountChat({ stored: events })
    const popover = await openFromMark(title, 'Ready')
    const field = byRole('textbox', 'Follow-up', popover)
    const computer = [resizeHeightLabel, resizeWidthLabel].map(
      (label) =>
        field.compareDocumentPosition(byRole('separator', label, popover)) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    )
    await view.unmount()
    await mountChat({ stored: events, viewport: 'mobile' })
    const sheet = await openFromMark(title, 'Ready')
    expect({
      computer,
      phone: sheet.querySelectorAll('[role="separator"]').length,
    }).toEqual({
      computer: [
        Node.DOCUMENT_POSITION_FOLLOWING,
        Node.DOCUMENT_POSITION_FOLLOWING,
      ],
      phone: 0,
    })
  })

  it('moves each free edge in the direction of its arrow from the size that shows, stops the height at the room by the mark, and the browser keeps the size', async () => {
    const storage = new MemoryStorage()
    new PanelLayout(storage).explain.height.choose(600)
    // The panel stands above the end of its mark, near the end of the
    // frame. The room above the mark is 416 px, so the panel shows 416 px
    // of the 600 px that the member chose before.
    layOutPopover({
      frame: new DOMRect(0, 0, 1440, 900),
      mark: new DOMRect(1100, 428, 200, 18),
      panel: new DOMRect(900, 6, 400, 416),
    })
    const { events } = explained('explain-1', quote)
    await mountChat({ stored: events, panels: new PanelLayout(storage) })
    const popover = await openFromMark(title, 'Ready')
    const height = byRole('separator', resizeHeightLabel, popover)
    const width = byRole('separator', resizeWidthLabel, popover)
    height.focus()
    await pressKey('ArrowUp')
    const atRoom = {
      value: height.getAttribute('aria-valuenow'),
      kept: kept(storage),
    }
    await pressKey('ArrowDown')
    width.focus()
    await pressKey('ArrowLeft')
    expect({
      atRoom,
      height: height.getAttribute('aria-valuenow'),
      width: width.getAttribute('aria-valuenow'),
      kept: kept(storage),
      fixedHeight: popover.classList.contains(popoverStyles.fixedHeight),
      endFirst: popover.classList.contains(styles.endFirst),
    }).toEqual({
      atRoom: { value: '416', kept: { width: null, height: 600 } },
      height: '408',
      width: '408',
      kept: { width: 408, height: 408 },
      fixedHeight: true,
      endFirst: true,
    })
    await pressKey('Escape')
    expect(queryByRole('dialog', title)).toBeNull()
  })

  it('stops a move of the width at the room on its side of the mark, also where the other side has more room', async () => {
    const storage = new MemoryStorage()
    // The panel stands below the start of a mark in the middle of the
    // frame. Its side has 534 px from the start of the mark to the end of
    // the frame, less the margin of 6 px. The other side has 994 px, so the
    // panel could show 720 px wide there.
    layOutPopover({
      frame: new DOMRect(0, 0, 1440, 900),
      mark: new DOMRect(900, 100, 100, 18),
      panel: new DOMRect(900, 124, 400, 300),
    })
    const { events } = explained('explain-1', quote)
    await mountChat({ stored: events, panels: new PanelLayout(storage) })
    const popover = await openFromMark(title, 'Ready')
    const width = byRole('separator', resizeWidthLabel, popover)
    const highest = width.getAttribute('aria-valuemax')
    width.focus()
    await pressKey('End')
    expect({
      highest,
      shown: popover.style.getPropertyValue('--explain-width'),
      value: width.getAttribute('aria-valuenow'),
      kept: kept(storage).width,
    }).toEqual({ highest: '534', shown: '534px', value: '534', kept: 534 })
  })

  it('in a browser without anchor positioning, keeps the panel to the chosen height and keeps it at the end of its mark as it narrows', async () => {
    const storage = new MemoryStorage()
    const { explain } = new PanelLayout(storage)
    explain.width.choose(600)
    explain.height.choose(600)
    // From the start of the mark, the chosen 600 px pass the end of the
    // frame, so the panel ends at the end of the mark, at x 1000. Below the
    // mark the frame has 770 px of room, more than the chosen height.
    layOutPopover({
      frame: new DOMRect(0, 0, 1440, 900),
      mark: new DOMRect(900, 100, 100, 18),
      panel: new DOMRect(400, 124, 600, 300),
    })
    withoutAnchorPositioning()
    const { events } = explained('explain-1', quote)
    await mountChat({ stored: events, panels: new PanelLayout(storage) })
    const popover = await openFromMark(title, 'Ready')
    const opened = {
      left: popover.style.left,
      maxHeight: popover.style.maxHeight,
    }
    // Home narrows the panel to 320 px, which fit from the start of the mark
    // again. The panel keeps the end of the mark: its left edge goes to
    // 1000 - 320 = 680 px.
    byRole('separator', resizeWidthLabel, popover).focus()
    await pressKey('Home')
    expect({ opened, narrowed: popover.style.left }).toEqual({
      opened: { left: '400px', maxHeight: '600px' },
      narrowed: '680px',
    })
  })

  it('keeps the popover open at a press on a handle, which stores nothing, and a drag of the corner moves both free edges', async () => {
    const storage = new MemoryStorage()
    // The panel stands below the start of its mark, 400 px by 300 px.
    layOutPopover({
      frame: new DOMRect(0, 0, 1440, 900),
      mark: new DOMRect(100, 100, 200, 18),
      panel: new DOMRect(100, 124, 400, 300),
    })
    const { events } = explained('explain-1', quote)
    await mountChat({ stored: events, panels: new PanelLayout(storage) })
    const popover = await openFromMark(title, 'Ready')
    const width = byRole('separator', resizeWidthLabel, popover)
    await pointer(width, 'pointerdown', { clientX: 498, clientY: 300 })
    await pointer(width, 'pointerup', { clientX: 498, clientY: 300 })
    const pressed = {
      open: queryByRole('dialog', title) === popover,
      stored: storage.values.size,
    }
    const corner = popover.querySelector(`.${popoverStyles.corner}`)
    if (!corner) throw new Error('The popover has no corner handle.')
    await pointer(corner, 'pointerdown', { clientX: 496, clientY: 420 })
    await pointer(corner, 'pointermove', { clientX: 556, clientY: 500 })
    await pointer(corner, 'pointerup', { clientX: 556, clientY: 500 })
    expect({ pressed, kept: kept(storage) }).toEqual({
      pressed: { open: true, stored: 0 },
      kept: { width: 460, height: 380 },
    })
  })
})
