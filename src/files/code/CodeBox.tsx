import type { ClipboardEvent, KeyboardEvent, ReactNode, Ref } from 'react'
import { classes } from '../ui/classes'
import { focusClass } from '../ui/layout'
import {
  copiedText,
  isSelectAll,
  selectAllIn,
  type CopySource,
} from './code-selection'
import styles from './code.module.css'

/**
 * The scroll box of a code or diff view. A press in the text gives it the
 * focus, so select all selects the content of the box only, and not the
 * whole app. With `source`, a copy gives the source text of the selected
 * lines, with their empty lines, in place of the text that the browser
 * reads from the rows. A copy with no source text, such as at a caret,
 * stays the browser's, so the clipboard keeps what it holds.
 */
export function CodeBox({
  ref,
  label,
  source,
  children,
}: {
  ref: Ref<HTMLDivElement>
  label: string
  source?: CopySource
  children: ReactNode
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isSelectAll(event)) return
    event.preventDefault()
    selectAllIn(event.currentTarget)
  }
  const onCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (!source || !selection) return
    const text = copiedText(selection, event.currentTarget, source)
    if (!text) return
    event.preventDefault()
    event.clipboardData.setData('text/plain', text)
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
