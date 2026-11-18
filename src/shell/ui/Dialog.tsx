import { useRef, type ReactNode, type RefObject } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/common/ConfirmDialog.module.css'
import { ActionButton } from './actions'
import { Overlay, useModalLayer, type Focusable } from './Overlay'
import { Sheet, trapTab } from './Sheet'
import { useViewport } from './viewport'

/**
 * A question that the user confirms before an action that they cannot
 * simply undo, or a short form, such as Send feedback. Desktop shows a
 * dialog over the dimmed app, and a phone shows a sheet. The actions come
 * last: Cancel, then the confirming action at the end. `initial` is the
 * part that takes the focus as it opens, such as the field of a form.
 *
 * The dialog draws Cancel, so no question draws its own. Cancel, Escape,
 * and a press outside ask to close in one way, and `close` closes the
 * question. `busy` says that the write of the question runs. While it
 * runs, the question stays open: Cancel is off, and Escape and a press
 * outside do nothing, on desktop and in the sheet of a phone. So the
 * result or the error of the write shows in the question. A question that
 * closes before its write starts gives `busy={false}`. After a write that
 * worked, the caller closes the question.
 */
export function Dialog(props: {
  title: string
  /** The write of the question runs, so nothing closes the question. */
  busy: boolean
  close: () => void
  children: ReactNode
  /** The confirming action. Cancel comes before it. */
  action: ReactNode
  wide?: boolean
  initial?: RefObject<Focusable | null>
}) {
  const viewport = useViewport()
  const { busy, close } = props
  // The one dismissal of the question: Cancel, Escape, and a press
  // outside, on desktop and on a phone.
  const dismiss = () => {
    if (!busy) close()
  }
  const actions = (
    <>
      <ActionButton disabled={busy} onPress={dismiss}>
        Cancel
      </ActionButton>
      {props.action}
    </>
  )
  if (viewport === 'phone') {
    return (
      <Sheet close={dismiss} initial={props.initial} title={props.title}>
        <div className={styles.sheetBody}>
          {props.children}
          <div className={styles.sheetActions}>{actions}</div>
        </div>
      </Sheet>
    )
  }
  return (
    <Overlay>
      <div className={styles.layer}>
        <div aria-hidden className={styles.scrim} />
        <DialogBox
          actions={actions}
          close={dismiss}
          initial={props.initial}
          title={props.title}
          wide={props.wide}
        >
          {props.children}
        </DialogBox>
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
