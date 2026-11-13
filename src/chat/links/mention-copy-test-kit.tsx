import type { ReactNode } from 'react'
import {
  COPY_TEXT_CLASS,
  COPYING_CLASS,
} from '../../../docs/mockups/src/components/chat/ChipCopyText'
import { useMentionCopy } from './mention-copy'

/** Makes each copy of the chat text inside it give the text of each chip. */
export function Copying(props: { children: ReactNode }) {
  useMentionCopy()
  return props.children
}

/**
 * The text of a block as the page shows it while a copy runs: a chip shows
 * only its copy text. The test page loads no style sheet, so this follows
 * the rule of `ChipCopyText.module.css`.
 */
function copyModeText(block: Element): string {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let text = ''
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    const chip = parent?.closest('[data-mention]')
    if (chip && !parent?.closest(`.${COPY_TEXT_CLASS}`)) continue
    text += node.textContent ?? ''
  }
  return text
}

/**
 * Copies the whole content of `root`, as Ctrl+A and Ctrl+C do. It gives
 * whether the page entered the copy state, whether a listener took the copy
 * from the browser, and the text of each child block of `root` in the copy
 * state, one block on each line.
 */
export function copyAll(root: Element) {
  document.getSelection()?.selectAllChildren(root)
  const event = new ClipboardEvent('copy', {
    bubbles: true,
    cancelable: true,
    clipboardData: new DataTransfer(),
  })
  document.dispatchEvent(event)
  return {
    copying: document.documentElement.classList.contains(COPYING_CLASS),
    native: !event.defaultPrevented,
    text: Array.from(root.children, copyModeText).join('\n'),
  }
}
