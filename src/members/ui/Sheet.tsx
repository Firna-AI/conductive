import { useId, useRef, type ReactNode } from 'react'
import { useModalDialog } from './modal'
import styles from './Sheet.module.css'

/**
 * A sheet that rises from the bottom of a phone screen over a dimmed page,
 * for a menu or a question that a phone shows in place of a desktop one.
 * Escape and a press on the dimmed page call `onDismiss`.
 */
export function Sheet(props: {
  title: string
  onDismiss: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const { onCancel, onClick } = useModalDialog(ref, props.onDismiss)
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
        {props.children}
      </div>
    </dialog>
  )
}
