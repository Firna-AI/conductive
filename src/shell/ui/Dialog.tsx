import { useRef, type ReactNode, type RefObject } from 'react'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/common/ConfirmDialog.module.css'
import card from '../../ui/components/common/ModalCard.module.css'
import { ActionButton } from './actions'
import { Overlay, useModalLayer, type Focusable } from './Overlay'
import { Sheet, trapTab } from './Sheet'
import { controlsOf } from './tab-stops'
import ui from './ui.module.css'
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
 *
 * A desktop dialog taller than the room of the frame keeps its title and
 * its actions, and its content scrolls between them. While that content is
 * text without a control, Tab stops on it too, so the keys of the keyboard
 * scroll it. It never takes the first focus.
 *
 * As the question closes, the focus goes back to the element that had it,
 * such as its trigger. `returnFocus` places it instead, such as on the next
 * row when the write took away the row of the trigger.
 *
 * The title of a phone sheet takes one line, with an ellipsis when it is
 * longer, and a desktop title wraps between words. `wrapTitle` shows the
 * whole title on both: the sheet gives it more lines, and a word longer
 * than a line breaks. A question whose title is the only place that names
 * its subject, such as a repository, gives it.
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
  returnFocus?: () => void
  /** The whole title shows, on more lines when it is long. */
  wrapTitle?: boolean
}) {
  const { busy, close } = props
  // The one dismissal of the question: Cancel, Escape, and a press
  // outside, on desktop and on a phone.
  const dismiss = () => {
    if (!busy) close()
  }
  return (
    <DialogFrame
      actions={
        <>
          <ActionButton disabled={busy} onPress={dismiss}>
            Cancel
          </ActionButton>
          {props.action}
        </>
      }
      close={dismiss}
      initial={props.initial}
      returnFocus={props.returnFocus}
      title={props.title}
      wide={props.wide}
      wrapTitle={props.wrapTitle}
    >
      {props.children}
    </DialogFrame>
  )
}

/**
 * A dialog that shows content, such as a log, with its own actions, such as
 * Reload and Close, and no Cancel. Escape and a press outside close it.
 * Desktop shows a dialog over the dimmed app, and a phone shows a sheet, as
 * for `Dialog`.
 */
export function ViewDialog(props: {
  title: string
  close: () => void
  children: ReactNode
  /** The actions at the end, such as Reload, then Close. */
  actions: ReactNode
  wide?: boolean
}) {
  return (
    <DialogFrame
      actions={props.actions}
      close={props.close}
      title={props.title}
      wide={props.wide}
    >
      {props.children}
    </DialogFrame>
  )
}

/** The dialog of desktop, or the sheet of a phone, with its actions last. */
function DialogFrame(props: {
  title: string
  close: () => void
  children: ReactNode
  actions: ReactNode
  wide?: boolean
  initial?: RefObject<Focusable | null>
  returnFocus?: () => void
  wrapTitle?: boolean
}) {
  const viewport = useViewport()
  if (viewport === 'phone') {
    return (
      <Sheet
        close={props.close}
        initial={props.initial}
        returnFocus={props.returnFocus}
        title={props.title}
        wrapTitle={props.wrapTitle}
      >
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
        <DialogBox
          actions={props.actions}
          close={props.close}
          initial={props.initial}
          returnFocus={props.returnFocus}
          title={props.title}
          wide={props.wide}
          wrapTitle={props.wrapTitle}
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
  returnFocus?: () => void
  wrapTitle?: boolean
}) {
  const dialog = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  useModalLayer(dialog, props.close, {
    initial: props.initial,
    returnFocus: props.returnFocus,
  })
  return (
    <section
      aria-label={props.title}
      aria-modal
      className={classes(styles.dialog, card.card, props.wide && styles.wide)}
      onKeyDownCapture={(event) => trapTab(event, controlsOf, body.current)}
      ref={dialog}
      role="dialog"
      tabIndex={-1}
    >
      <h2
        className={classes(
          styles.title,
          card.head,
          props.wrapTitle && styles.wrapTitle,
        )}
      >
        {props.title}
      </h2>
      {/*
       * The browser makes no Tab stop of the body. The trap does, while the
       * body scrolls text.
       */}
      <div
        className={classes(styles.body, card.body, ui.focusable)}
        ref={body}
        tabIndex={-1}
      >
        {props.children}
      </div>
      <div className={classes(styles.actions, card.foot)}>{props.actions}</div>
    </section>
  )
}

/** A paragraph of a dialog. */
export function DialogText(props: { children: ReactNode }) {
  return <p className={styles.text}>{props.children}</p>
}
