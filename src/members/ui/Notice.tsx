import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import styles from './Notice.module.css'

/**
 * A short message in a box with a full border and a tinted fill. A danger
 * notice is an alert, so a screen reader reads it when it shows.
 */
export function Notice(props: {
  icon: LucideIcon
  title: string
  body?: ReactNode
  tone?: 'neutral' | 'danger'
  action?: ReactNode
}) {
  const Icon = props.icon
  const danger = props.tone === 'danger'
  return (
    <div
      className={danger ? `${styles.notice} ${styles.danger}` : styles.notice}
      role={danger ? 'alert' : undefined}
    >
      <Icon aria-hidden className={styles.icon} size={16} />
      <div className={styles.text}>
        <span className={styles.title}>{props.title}</span>
        {props.body ? <span className={styles.body}>{props.body}</span> : null}
      </div>
      {props.action ? (
        <div className={styles.action}>{props.action}</div>
      ) : null}
    </div>
  )
}
