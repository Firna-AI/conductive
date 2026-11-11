import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import styles from './Notice.module.css'

/** The spinner that takes the place of the icon while the work runs. */
function BusyGlyph() {
  const theme = useSharedUiTheme()
  return (
    <span className={`${styles.icon} ${styles.busy}`}>
      <Spinner color={theme.colors.primary} size={14} />
    </span>
  )
}

/**
 * A short message in a box with a full border and a tinted fill. A danger
 * notice is an alert, so a screen reader reads it when it shows. A notice
 * of work that runs, such as a build, shows a spinner in place of its icon.
 */
export function Notice(props: {
  icon: LucideIcon
  title: string
  body?: ReactNode
  tone?: 'neutral' | 'danger'
  action?: ReactNode
  busy?: boolean
}) {
  const Icon = props.icon
  const danger = props.tone === 'danger'
  return (
    <div
      className={danger ? `${styles.notice} ${styles.danger}` : styles.notice}
      role={danger ? 'alert' : undefined}
    >
      {props.busy ? (
        <BusyGlyph />
      ) : (
        <Icon aria-hidden className={styles.icon} size={16} />
      )}
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
