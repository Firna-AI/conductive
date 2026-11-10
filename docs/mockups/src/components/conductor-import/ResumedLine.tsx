import { FileText, History } from 'lucide-react'
import styles from '../chat/LinkedLine.module.css'
import { ScreenLink } from '../common/ScreenLink'

/**
 * The first line of a session from Conductor after the activation, in the
 * look of the line of a linked session. The session continues with the
 * agent's memory, or it could not resume and started fresh from its old
 * chat. The title of the old session opens its document at `to`, and
 * stays plain text where the mockups draw no document.
 */
export function ResumedLine(props: {
  title: string
  outcome: 'memory' | 'fallback'
  to?: string
}) {
  const title = props.to ? (
    <ScreenLink to={props.to}>{props.title}</ScreenLink>
  ) : (
    props.title
  )
  if (props.outcome === 'memory') {
    return (
      <p className={styles.line}>
        <History aria-hidden className={styles.icon} size={13} />
        <span>Continues {title} from Conductor</span>
      </p>
    )
  }
  return (
    <p className={styles.line}>
      <FileText aria-hidden className={styles.icon} size={13} />
      <span>
        {title} couldn&apos;t resume, so this session started fresh with its old
        chat
      </span>
    </p>
  )
}
