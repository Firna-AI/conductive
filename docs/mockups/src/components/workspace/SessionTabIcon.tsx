import { Spinner } from '@firna/ui/spinner'
import { MessageSquare } from 'lucide-react'
import { classes } from '../common/classes'
import { activityPresentation } from '../workspaces/status'
import { WorkspaceMark } from '../workspaces/WorkspaceMark'
import styles from './WorkspaceTabs.module.css'

/**
 * The icon of a session tab: the chat icon, the spinner while its agent
 * works, or the needs-input mark while its session holds an open request
 * (needs-input decision 2 B). The mark is the list mark of a workspace that
 * needs input: blue, in the accent colour, with its slow pulse, and still
 * with reduced motion. It wins over the spinner, because the member must
 * act. Screen readers hear "Needs input". The app shares this part.
 */
export function SessionTabIcon(props: {
  running: boolean
  needsInput?: boolean
}) {
  if (props.needsInput) {
    return (
      <span
        aria-label={activityPresentation.input.label}
        className={classes(styles.icon, styles.needsInput)}
        role="img"
      >
        <WorkspaceMark github={null} status="input" />
      </span>
    )
  }
  return props.running ? (
    <span className={styles.icon}>
      <Spinner accessibilityLabel="Working" color="var(--ui-muted)" size={13} />
    </span>
  ) : (
    <MessageSquare aria-hidden className={styles.icon} size={13} />
  )
}
