import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import styles from './ToolStates.module.css'

/** A quiet line with a spinner, while a tool waits for data or the sandbox. */
export function ToolWaiting(props: { label: string }) {
  const theme = useSharedUiTheme()
  return (
    <div className={styles.waiting} role="status">
      <Spinner
        accessibilityLabel={props.label}
        color={theme.colors.muted}
        size={13}
      />
      <span aria-hidden>{props.label}</span>
    </div>
  )
}

/**
 * A quiet centred message, for a tool with nothing to show yet, a stopped
 * sandbox, or an error. An error is announced as an alert.
 */
export function ToolMessage(props: {
  icon: LucideIcon
  title: string
  body?: string
  action?: ReactNode
  alert?: boolean
}) {
  const Icon = props.icon
  return (
    <div className={styles.message} role={props.alert ? 'alert' : undefined}>
      <Icon className={styles.icon} size={28} strokeWidth={1.5} />
      <h2 className={styles.title}>{props.title}</h2>
      {props.body ? <p className={styles.body}>{props.body}</p> : null}
      {props.action ? (
        <div className={styles.action}>{props.action}</div>
      ) : null}
    </div>
  )
}
