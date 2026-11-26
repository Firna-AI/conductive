import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { mount } from '../../test-support/mount'

/** Mounts the element beside other page text, and finds its code box. */
export async function mountBox(element: ReactNode) {
  const view = await mount(
    <>
      <p>page text</p>
      {element}
    </>,
  )
  const box = view.container.querySelector('[role=region]')
  const outside = view.container.querySelector('p')
  if (!box || !outside) throw new Error('No code box')
  return { box, outside }
}

/** Presses the key on the box, and returns whether React stopped it. */
export function press(box: Element, init: KeyboardEventInit): boolean {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  box.dispatchEvent(event)
  return event.defaultPrevented
}

/** Where the selection is after a press of select all on the box. */
export function selectAll(
  box: Element,
  outside: Element,
  init: KeyboardEventInit,
) {
  document.getSelection()?.removeAllRanges()
  const stopped = press(box, { key: 'a', ...init })
  const range = document.getSelection()?.getRangeAt(0)
  return {
    stopped,
    inBox: range?.commonAncestorContainer === box,
    outside: range?.intersectsNode(outside) ?? false,
  }
}

/** Sends a copy at the box, and returns the text that it gives. */
export function copy(box: Element): { prevented: boolean; text: string } {
  const clipboardData = new DataTransfer()
  const event = new ClipboardEvent('copy', {
    bubbles: true,
    cancelable: true,
    clipboardData,
  })
  box.dispatchEvent(event)
  return {
    prevented: event.defaultPrevented,
    text: clipboardData.getData('text/plain'),
  }
}

/** The row of the line with `number`. */
export function row(box: Element, number: number): Element {
  const found = box.querySelectorAll('[data-copy-line]')[number - 1]
  if (!found) throw new Error(`No line ${number}`)
  return found
}

/** The text node of the line with `number`. */
export function lineNode(box: Element, number: number): Node {
  const node = row(box, number).querySelector('[data-copy-text] span')
  if (!node?.firstChild) throw new Error(`No text on line ${number}`)
  return node.firstChild
}

/** A range between two boundary points. */
export function span(start: [Node, number], end: [Node, number]): Range {
  const range = document.createRange()
  range.setStart(...start)
  range.setEnd(...end)
  return range
}

/**
 * Makes the page selection hold `ranges`. happy-dom keeps one range, so a
 * selection of more ranges, as Firefox makes, is a stub.
 */
export function selectRanges(ranges: readonly Range[]): void {
  vi.spyOn(window, 'getSelection').mockReturnValue({
    rangeCount: ranges.length,
    getRangeAt: (index: number) => ranges[index],
  } as unknown as Selection)
}
