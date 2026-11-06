import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import styles from '../../../docs/mockups/src/components/common/Sheet.module.css'
import { Overlay, useDismiss, useFocusReturn } from './Overlay'

/** Keeps the Tab key inside a modal layer, as a dialog needs. */
export function trapTab(event: KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Tab') return
  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    ),
  )
  const first = focusable[0]
  const last = focusable.at(-1)
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

/**
 * A sheet that rises from the bottom of a phone screen over the dimmed
 * app. A press on the dim area or Escape closes it.
 */
export function Sheet(props: {
  title: string
  close: () => void
  children: ReactNode
}) {
  const sheet = useRef<HTMLElement>(null)
  useDismiss(true, sheet, props.close)
  useFocusReturn(sheet)
  return (
    <Overlay>
      <div className={styles.layer}>
        <div aria-hidden className={styles.scrim} />
        <section
          aria-label={props.title}
          aria-modal
          className={styles.sheet}
          onKeyDown={trapTab}
          ref={sheet}
          role="dialog"
          tabIndex={-1}
        >
          <span aria-hidden className={styles.handle} />
          <h2 className={styles.title}>{props.title}</h2>
          {props.children}
        </section>
      </div>
    </Overlay>
  )
}
