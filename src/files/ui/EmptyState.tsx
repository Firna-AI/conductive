import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import styles from './EmptyState.module.css'

/** A quiet centred message for a view with nothing to show, or an error. */
export function EmptyState(props: {
  icon: LucideIcon
  title: string
  body?: string
  action?: ReactNode
  /** An error is announced as soon as it shows. */
  alert?: boolean
}) {
  const Icon = props.icon
  return (
    <div className={styles.empty} role={props.alert ? 'alert' : undefined}>
      <Icon aria-hidden className={styles.icon} size={28} strokeWidth={1.5} />
      <h2 className={styles.title}>{props.title}</h2>
      {props.body ? <p className={styles.body}>{props.body}</p> : null}
      {props.action ? (
        <div className={styles.action}>{props.action}</div>
      ) : null}
    </div>
  )
}

/** A spinner and a short label while a read runs. */
export function Loading(props: { label: string }) {
  const theme = useSharedUiTheme()
  return (
    <div className={styles.loading} role="status">
      <Spinner
        accessibilityLabel={props.label}
        color={theme.colors.muted}
        size={13}
      />
      {props.label}
    </div>
  )
}
