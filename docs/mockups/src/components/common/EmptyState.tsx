import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import styles from './EmptyState.module.css'

/** A quiet centred message for a view with nothing to show yet. */
export function EmptyState(props: {
  icon: LucideIcon
  title: string
  body?: string
  action?: ReactNode
}) {
  const Icon = props.icon
  return (
    <div className={styles.empty}>
      <Icon className={styles.icon} size={28} strokeWidth={1.5} />
      <h2 className={styles.title}>{props.title}</h2>
      {props.body ? <p className={styles.body}>{props.body}</p> : null}
      {props.action ? (
        <div className={styles.action}>{props.action}</div>
      ) : null}
    </div>
  )
}
