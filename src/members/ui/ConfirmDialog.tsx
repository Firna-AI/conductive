import { useContext, useId, useRef, type ReactNode } from 'react'
import { ActionButton } from './actions'
import { useViewport } from './controls'
import { DialogClose, useModalDialog } from './modal'
import { Sheet } from './Sheet'
import styles from './ConfirmDialog.module.css'

type ConfirmDialogProps = {
  title: string
  /** The confirming action runs. */
  busy: boolean
  onCancel: () => void
  children: ReactNode
  /** The confirming action. Cancel comes before it. */
  action: ReactNode
}

/**
 * A question that the user confirms before an action. Desktop shows a
 * dialog over the dimmed app, and a phone shows a sheet. The actions come
 * last: Cancel, then the confirming action at the end.
 *
 * Cancel, Escape, a press on the dimmed page, and a close by the browser
 * ask to cancel in one way. While `busy`, the question refuses and stays
 * open, so the result or the error of the action shows in it. After an
 * action that worked, the caller closes the question.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const viewport = useViewport()
  const actions = (
    <>
      <CancelButton />
      {props.action}
    </>
  )
  if (viewport === 'mobile') {
    return (
      <Sheet busy={props.busy} onDismiss={props.onCancel} title={props.title}>
        <div className={styles.sheetBody}>
          {props.children}
          <div className={styles.sheetActions}>{actions}</div>
        </div>
      </Sheet>
    )
  }
  return (
    <DesktopDialog
      actions={actions}
      busy={props.busy}
      onCancel={props.onCancel}
      title={props.title}
    >
      {props.children}
    </DesktopDialog>
  )
}

/** Cancel asks the dialog around it to close, in the same way as Escape. */
function CancelButton() {
  const close = useContext(DialogClose)
  return <ActionButton onPress={() => void close()}>Cancel</ActionButton>
}

function DesktopDialog(
  props: Omit<ConfirmDialogProps, 'action'> & { actions: ReactNode },
) {
  const ref = useRef<HTMLDialogElement>(null)
  const { dismiss, onCancel, onClick } = useModalDialog(
    ref,
    props.onCancel,
    props.busy,
  )
  const titleId = useId()
  return (
    <dialog
      aria-labelledby={titleId}
      className={styles.layer}
      onCancel={onCancel}
      onClick={onClick}
      ref={ref}
    >
      <div className={styles.dialog}>
        <h2 className={styles.title} id={titleId}>
          {props.title}
        </h2>
        <DialogClose value={dismiss}>
          {props.children}
          <div className={styles.actions}>{props.actions}</div>
        </DialogClose>
      </div>
    </dialog>
  )
}

/** A paragraph of a dialog. */
export function DialogText(props: { children: ReactNode }) {
  return <p className={styles.text}>{props.children}</p>
}
