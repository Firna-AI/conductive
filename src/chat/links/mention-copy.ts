import { useEffect } from 'react'

/** The mark of a file chip in a sent message: the text of its mention. */
const MENTION = 'data-mention'

/**
 * Whether an element lies in the line around it: inline, out of the flow,
 * such as the hidden words of a chip, or a flex item of an inline box,
 * such as the text of a chip, which computes as a block.
 */
function inLine(element: Element): boolean {
  const view = element.ownerDocument.defaultView
  const style = view?.getComputedStyle(element)
  const display = style?.display ?? ''
  if (display === '' || display.startsWith('inline')) return true
  if (display === 'contents') return true
  if (style?.position === 'absolute' || style?.position === 'fixed') {
    return true
  }
  const parent = element.parentElement
  const outer = parent ? (view?.getComputedStyle(parent).display ?? '') : ''
  return outer.startsWith('inline')
}

/**
 * The nearest element of a node's line: an ancestor that starts its own
 * line. A display that the page does not know counts as inline.
 */
function blockOf(element: Element): Element {
  for (let at: Element | null = element; at; at = at.parentElement) {
    if (!inLine(at)) return at
  }
  return element.ownerDocument.documentElement
}

/** Whether a closed `<details>` hides the element: it is not in its summary. */
function inClosedDetails(element: Element): boolean {
  for (
    let details = element.closest('details');
    details;
    details = details.parentElement?.closest('details') ?? null
  ) {
    if (details.open) continue
    const summary = details.querySelector(':scope > summary')
    if (!summary?.contains(element)) return true
  }
  return false
}

/** Whether the element or an ancestor takes no selection. */
function unselectable(element: Element): boolean {
  const view = element.ownerDocument.defaultView
  for (let at: Element | null = element; at; at = at.parentElement) {
    if (view?.getComputedStyle(at).userSelect === 'none') return true
  }
  return false
}

/**
 * Whether the browser leaves the text of the element out of a copy: it is
 * hidden, such as the steps of a closed work fold, or it takes no
 * selection.
 */
function leftOut(element: Element): boolean {
  if (inClosedDetails(element)) return true
  if (element.checkVisibility?.() === false) return true
  return unselectable(element)
}

/** The file chips that a range reaches, also the one that holds it. */
function chipsIn(range: Range, scope: Element): Element[] {
  const around = scope.closest(`[${MENTION}]`)
  const inside = [...scope.querySelectorAll(`[${MENTION}]`)]
  return [...(around ? [around] : []), ...inside].filter((chip) =>
    range.intersectsNode(chip),
  )
}

/**
 * The text of a selection in the chat, with the mention of each file chip
 * in it, such as `@src/app.ts`, or null when the selection holds no file
 * chip. A new line goes between the lines of two blocks, such as two
 * messages. Text that the browser leaves out of a copy stays out, such as
 * the steps of a closed work fold. The message field copies its own chips,
 * so a selection there gives null too.
 */
function selectedText(selection: Selection): string | null {
  if (selection.rangeCount === 0 || selection.isCollapsed) return null
  const range = selection.getRangeAt(0)
  const common = range.commonAncestorContainer
  const scope = common instanceof Element ? common : common.parentElement
  if (!scope || scope.closest('[contenteditable="true"]')) return null
  if (chipsIn(range, scope).length === 0) return null
  const walker = scope.ownerDocument.createTreeWalker(
    scope,
    NodeFilter.SHOW_TEXT,
  )
  const seen = new Set<Element>()
  let text = ''
  let line: Element | null = null
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (!parent || !range.intersectsNode(node)) continue
    const chip = parent.closest(`[${MENTION}]`)
    if (leftOut(chip ?? parent)) continue
    const block = blockOf(chip ?? parent)
    if (line && block !== line && text !== '' && !text.endsWith('\n')) {
      text += '\n'
    }
    line = block
    if (chip) {
      if (!seen.has(chip)) text += chip.getAttribute(MENTION) ?? ''
      seen.add(chip)
      continue
    }
    const value = node.textContent ?? ''
    const end = node === range.endContainer ? range.endOffset : value.length
    const start = node === range.startContainer ? range.startOffset : 0
    text += value.slice(start, end)
  }
  return text
}

/**
 * Makes each copy of chat text give the mention of each file chip in it,
 * also across several messages. A copy without a file chip stays native.
 * The listener is on the document, because a copy of text that cannot take
 * the focus goes to the body.
 */
export function useMentionCopy(): void {
  useEffect(() => {
    const onCopy = (event: ClipboardEvent) => {
      if (event.defaultPrevented || !event.clipboardData) return
      const selection = document.getSelection()
      const text = selection ? selectedText(selection) : null
      if (text === null) return
      event.clipboardData.setData('text/plain', text)
      event.preventDefault()
    }
    document.addEventListener('copy', onCopy)
    return () => document.removeEventListener('copy', onCopy)
  }, [])
}
