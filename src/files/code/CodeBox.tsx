import type { ClipboardEvent, KeyboardEvent, ReactNode, Ref } from 'react'
import { classes } from '../ui/classes'
import { focusClass } from '../ui/layout'
import {
  copiedText,
  isSelectAll,
  selectAllIn,
  type CopyLine,
} from './code-selection'
import styles from './code.module.css'

/**
 * The scroll box of a code or diff view. A press in the text gives it the
 * focus, so select all selects the content of the box only, and not the
 * whole app. With `lines`, a copy gives the source text of the selected
 * lines, with their empty lines and line ends, in place of the text that
 * the browser reads from the rows.
 */
export function CodeBox({
  ref,
  label,
  lines,
  children,
}: {
  ref: Ref<HTMLDivElement>
  label: string
  lines?: readonly CopyLine[]
  children: ReactNode
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isSelectAll(event)) return
    event.preventDefault()
    selectAllIn(event.currentTarget)
  }
  const onCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (!lines || !selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const box = event.currentTarget
    if (!box.contains(range.commonAncestorContainer)) return
    event.preventDefault()
    event.clipboardData.setData('text/plain', copiedText(range, box, lines))
  }
  return (
    <div
      aria-label={label}
      className={classes(styles.scroll, focusClass)}
      onCopy={onCopy}
      onKeyDown={onKeyDown}
      ref={ref}
      role="region"
      tabIndex={0}
    >
      {children}
    </div>
  )
}
