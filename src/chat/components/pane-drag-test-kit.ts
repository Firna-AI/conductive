import paneDrop from '../../../docs/mockups/src/components/workspace/PaneDrop.module.css'
import splitStyles from '../../../docs/mockups/src/components/workspace/SplitColumn.module.css'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import { splitView } from '../state/pane-test-kit'
import { viewPath } from '../state/tab-order-test-kit'
import type { mountSplit } from './split-test-kit'
import { pointer } from './tab-drag-test-kit'

// The helpers of the tests that drag tabs between the panes of a column:
// the boxes that happy-dom does not lay out, the drag of a mouse, and what
// the column shows back.

/** A point of the window, in CSS px. */
export type Point = { x: number; y: number }

const mouse = { pointerType: 'mouse' }

/** A saved view of one pane with these tabs, the first one shown. */
export function onePane(tabs: readonly WorkspaceTab[]): WorkspaceView {
  return {
    ...splitView,
    panes: [{ tabs, activeTab: tabs[0], temporaryTab: null }],
    focusedPane: 0,
  }
}

/** Gives an element a box, in CSS px of the window, which happy-dom lacks. */
export function setBox(
  element: Element,
  box: { left: number; top: number; width: number; height: number },
) {
  const rect = new DOMRect(box.left, box.top, box.width, box.height)
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  })
}

/** The content under the row of each pane on desktop, the left pane first. */
export function paneContents(): HTMLElement[] {
  return Array.from(document.querySelectorAll('div')).filter((node) =>
    node.classList.contains(splitStyles.content),
  )
}

/**
 * Lays out the desktop column of 801 px as a browser does: the panes side
 * by side with a hairline of 1 px between them, each row 30 px tall with
 * tabs of 100 px from the left side of its pane, and each content under its
 * row, down to 600 px.
 */
export function layOutColumn() {
  const contents = paneContents()
  const width = (801 - (contents.length - 1)) / contents.length
  contents.forEach((content, at) => {
    const left = at * (width + 1)
    setBox(content, { left, top: 30, width, height: 570 })
    const row = content.parentElement?.querySelector('nav ul')
    const tabs = row?.querySelectorAll(':scope > li:not([aria-hidden])') ?? []
    tabs.forEach((tab, index) => {
      setBox(tab, { left: left + index * 100, top: 0, width: 100, height: 30 })
    })
  })
}

/**
 * The drop mark of a drag over the content of a pane: on a half of the one
 * pane, over the whole pane, or none.
 */
export function markIn(content: HTMLElement): 'left' | 'right' | 'pane' | null {
  const mark = Array.from(content.querySelectorAll('div')).find((node) =>
    node.classList.contains(paneDrop.mark),
  )
  if (!mark) return null
  if (mark.classList.contains(paneDrop.left)) return 'left'
  if (mark.classList.contains(paneDrop.right)) return 'right'
  return 'pane'
}

/** What the status of a row tells a screen reader. */
export function statusOf(row: HTMLElement): string {
  return row.querySelector('[role="status"]')?.textContent ?? ''
}

/**
 * What the status of the column tells a screen reader after a move to
 * another pane. It is the status outside every row and every pane.
 */
export function columnStatus(): string {
  const status = Array.from(document.querySelectorAll('[role="status"]')).find(
    (node) => node.closest('nav, section') === null,
  )
  return status?.textContent ?? ''
}

export function moveTo(to: Point) {
  pointer(window, 'pointermove', { ...mouse, clientX: to.x, clientY: to.y })
}

/**
 * A mouse presses the tab at the middle of its box, lifts it with a move
 * of 10 px, and holds the pointer at `to`.
 */
export function dragTo(tab: HTMLElement, to: Point) {
  const box = tab.closest('li')?.getBoundingClientRect()
  const x = (box?.left ?? 0) + (box?.width ?? 0) / 2
  pointer(tab, 'pointerdown', { ...mouse, clientX: x, clientY: 15 })
  pointer(window, 'pointermove', { ...mouse, clientX: x + 10, clientY: 15 })
  moveTo(to)
}

export function release(at: Point) {
  const up = { ...mouse, clientX: at.x, clientY: at.y, buttons: 0 }
  pointer(window, 'pointerup', up)
}

/** The view saves of a chat of `mountSplit`. */
export function viewSaves(chat: Awaited<ReturnType<typeof mountSplit>>) {
  return chat.writes().filter((item) => new URL(item.url).pathname === viewPath)
}
