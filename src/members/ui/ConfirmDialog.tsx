import { useId, useRef, type ReactNode } from 'react'
import { useViewport } from './controls'
import { useModalDialog } from './modal'
import { Sheet } from './Sheet'
import styles from './ConfirmDialog.module.css'

/**
 * A question that the user confirms before an action. Desktop shows a
 * dialog over the dimmed app, and a phone shows a sheet. The actions come
 * last, with the confirming action at the end. Escape and a press on the
 * dimmed page call `onCancel`.
 */
export function ConfirmDialog(props: {
  title: string
  onCancel: () => void
  children: ReactNode
  actions: ReactNode
}) {
  const viewport = useViewport()
  if (viewport === 'mobile') {
    return (
      <Sheet onDismiss={props.onCancel} title={props.title}>
        <div className={styles.sheetBody}>
          {props.children}
          <div className={styles.sheetActions}>{props.actions}</div>
        </div>
      </Sheet>
    )
  }
  return <DesktopDialog {...props} />
}

function DesktopDialog(props: {
  title: string
  onCancel: () => void
  children: ReactNode
  actions: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const { onCancel, onClick } = useModalDialog(ref, props.onCancel)
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
        {props.children}
        <div className={styles.actions}>{props.actions}</div>
      </div>
    </dialog>
  )
}

/** A paragraph of a dialog. */
export function DialogText(props: { children: ReactNode }) {
  return <p className={styles.text}>{props.children}</p>
}
