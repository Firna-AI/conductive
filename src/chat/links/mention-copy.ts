import { useEffect } from 'react'
import { COPYING_CLASS } from '../../../docs/mockups/src/components/chat/ChipCopyText'

/**
 * The mark of a file chip, or of the chip of an attached file, in a sent
 * message or an answer: the text that a copy of the chip gives.
 */
const MENTION = 'data-mention'

/** The chip that holds a node, or null. */
function chipAt(node: Node): Element | null {
  const element = node instanceof Element ? node : node.parentElement
  return element?.closest(`[${MENTION}]`) ?? null
}

/** Whether the range reaches a chip, also one that holds the range. */
function reachesChip(range: Range, scope: Element): boolean {
  if (chipAt(scope)) return true
  return [...scope.querySelectorAll(`[${MENTION}]`)].some((chip) =>
    range.intersectsNode(chip),
  )
}

/**
 * Moves each edge of the range that stands inside a chip to the edge of
 * that chip. A copy then holds each chip whole, because a chip shows only
 * its copy text while a copy runs.
 */
function holdWholeChips(range: Range): void {
  const start = chipAt(range.startContainer)
  if (start) range.setStartBefore(start)
  const end = chipAt(range.endContainer)
  if (end) range.setEndAfter(end)
}

/**
 * Makes each copy of chat text give the text of each chip in it, such as
 * `@src/app.ts`, through the browser's own copy. So a paste into a rich
 * editor keeps the bold, the code, the lists, and the tables. While the
 * copy runs, the root of the page has `COPYING_CLASS`: each chip then shows
 * only its copy text. The next animation frame removes the class, before
 * the page paints. The message field copies its own chips, and a copy
 * without a chip needs no class. The listener is on the document, because
 * a copy of text that cannot take the focus goes to the body.
 */
export function useMentionCopy(): void {
  useEffect(() => {
    const root = document.documentElement
    let frame: number | null = null
    const onCopy = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return
      const selection = document.getSelection()
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
        return
      const range = selection.getRangeAt(0)
      const common = range.commonAncestorContainer
      const scope = common instanceof Element ? common : common.parentElement
      if (!scope || scope.closest('[contenteditable="true"]')) return
      if (!reachesChip(range, scope)) return
      holdWholeChips(range)
      selection.removeAllRanges()
      selection.addRange(range)
      root.classList.add(COPYING_CLASS)
      if (frame !== null) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = null
        root.classList.remove(COPYING_CLASS)
      })
    }
    document.addEventListener('copy', onCopy)
    return () => {
      document.removeEventListener('copy', onCopy)
      if (frame !== null) cancelAnimationFrame(frame)
      root.classList.remove(COPYING_CLASS)
    }
  }, [])
}
