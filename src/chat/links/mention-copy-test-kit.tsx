import type { ReactNode } from 'react'
import { useMentionCopy } from './mention-copy'

/** Makes each copy of the chat text inside it give the mention of each chip. */
export function Copying(props: { children: ReactNode }) {
  useMentionCopy()
  return props.children
}

/** Copies the whole content of `root`, as Ctrl+A and Ctrl+C do. */
export function copyAll(root: Element) {
  document.getSelection()?.selectAllChildren(root)
  const data = new DataTransfer()
  const event = new ClipboardEvent('copy', {
    bubbles: true,
    cancelable: true,
    clipboardData: data,
  })
  document.dispatchEvent(event)
  return { kept: event.defaultPrevented, text: data.getData('text/plain') }
}
