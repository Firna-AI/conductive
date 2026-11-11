import { useRef, type ReactNode, type RefObject } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/common/ConfirmDialog.module.css'
import { Overlay, useModalLayer, type Focusable } from './Overlay'
import { Sheet, trapTab } from './Sheet'
import { useViewport } from './viewport'

/**
 * A question that the user confirms before an action that they cannot
 * simply undo, or a short form, such as Send feedback. Desktop shows a
 * dialog over the dimmed app, and a phone shows a sheet. The actions come
 * last, with the confirming action at the end. `close` runs on Escape and
 * on a press outside, as Cancel does. `initial` is the part that takes the
 * focus as it opens, such as the field of a form.
 */
export function Dialog(props: {
  title: string
  close: () => void
  children: ReactNode
  actions: ReactNode
  wide?: boolean
  initial?: RefObject<Focusable | null>
}) {
  const viewport = useViewport()
  if (viewport === 'phone') {
    return (
      <Sheet close={props.close} initial={props.initial} title={props.title}>
        <div className={styles.sheetBody}>
          {props.children}
          <div className={styles.sheetActions}>{props.actions}</div>
        </div>
      </Sheet>
    )
  }
  return (
    <Overlay>
      <div className={styles.layer}>
        <div aria-hidden className={styles.scrim} />
        <DialogBox {...props} />
      </div>
    </Overlay>
  )
}

function DialogBox(props: {
  title: string
  close: () => void
  children: ReactNode
  actions: ReactNode
  wide?: boolean
  initial?: RefObject<Focusable | null>
}) {
  const dialog = useRef<HTMLElement>(null)
  useModalLayer(dialog, props.close, { initial: props.initial })
  return (
    <section
      aria-label={props.title}
      aria-modal
      className={classes(styles.dialog, props.wide && styles.wide)}
      onKeyDownCapture={trapTab}
      ref={dialog}
      role="dialog"
      tabIndex={-1}
    >
      <h2 className={styles.title}>{props.title}</h2>
      {props.children}
      <div className={styles.actions}>{props.actions}</div>
    </section>
  )
}

/** A paragraph of a dialog. */
export function DialogText(props: { children: ReactNode }) {
  return <p className={styles.text}>{props.children}</p>
}
