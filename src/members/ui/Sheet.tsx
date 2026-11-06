import { useId, useRef, type ReactNode } from 'react'
import { DialogClose, useModalDialog } from './modal'
import styles from './Sheet.module.css'

/**
 * A sheet that rises from the bottom of a phone screen over a dimmed page,
 * for a menu or a question that a phone shows in place of a desktop one.
 * Escape, a press on the dimmed page, and a close by the browser call
 * `onDismiss`, except while `busy`: then the sheet stays open.
 */
export function Sheet(props: {
  title: string
  /** The action of the sheet runs, so the sheet refuses to close. */
  busy?: boolean
  onDismiss: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const { dismiss, onCancel, onClick } = useModalDialog(
    ref,
    props.onDismiss,
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
      <div className={styles.sheet}>
        <span aria-hidden className={styles.handle} />
        <h2 className={styles.title} id={titleId}>
          {props.title}
        </h2>
        <DialogClose value={dismiss}>{props.children}</DialogClose>
      </div>
    </dialog>
  )
}
