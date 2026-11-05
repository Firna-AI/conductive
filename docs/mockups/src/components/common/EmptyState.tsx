import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Caption, H5 } from '@firna/ui/typography'
import styles from './EmptyState.module.css'

/** A centred message for a view with nothing to show yet. */
export function EmptyState(props: {
  icon: LucideIcon
  title: string
  body?: string
  action?: ReactNode
}) {
  const Icon = props.icon
  return (
    <div className={styles.empty}>
      <span className={styles.icon}>
        <Icon size={22} />
      </span>
      <H5>{props.title}</H5>
      {props.body ? <Caption>{props.body}</Caption> : null}
      {props.action ? (
        <div className={styles.action}>{props.action}</div>
      ) : null}
    </div>
  )
}
