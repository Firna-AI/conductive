import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import styles from './EmptyState.module.css'

/** A quiet centred message for a page with nothing else to show. */
export function EmptyState(props: {
  icon: LucideIcon
  title: string
  body?: string
  action?: ReactNode
  /** Content under the action, such as the error of the action. */
  children?: ReactNode
}) {
  const Icon = props.icon
  return (
    <div className={styles.empty}>
      <Icon aria-hidden className={styles.icon} size={28} strokeWidth={1.5} />
      <h2 className={styles.title}>{props.title}</h2>
      {props.body ? <p className={styles.body}>{props.body}</p> : null}
      {props.action ? (
        <div className={styles.action}>{props.action}</div>
      ) : null}
      {props.children}
    </div>
  )
}
