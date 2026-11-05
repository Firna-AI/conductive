import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Caption, Label } from '@firna/ui/typography'
import styles from './Notice.module.css'

/** A short inline message in a box with a tinted fill. */
export function Notice(props: {
  icon: LucideIcon
  title: string
  body?: ReactNode
  tone?: 'neutral' | 'danger'
  action?: ReactNode
}) {
  const Icon = props.icon
  const className =
    props.tone === 'danger'
      ? `${styles.notice} ${styles.danger}`
      : styles.notice
  return (
    <div
      className={className}
      role={props.tone === 'danger' ? 'alert' : undefined}
    >
      <Icon className={styles.icon} size={18} />
      <div className={styles.text}>
        <Label>{props.title}</Label>
        {props.body ? <Caption color="secondary">{props.body}</Caption> : null}
      </div>
      {props.action ? (
        <div className={styles.action}>{props.action}</div>
      ) : null}
    </div>
  )
}
