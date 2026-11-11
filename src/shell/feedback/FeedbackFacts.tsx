import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Info, Reply } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import {
  contextLine,
  noReplyLine,
  replyLine,
  replyLoadingLine,
  replyNotLoadedTitle,
} from '../../../docs/mockups/src/components/feedback/feedbackCopy'
import styles from '../../../docs/mockups/src/components/feedback/FeedbackDialog.module.css'
import type { FeedbackState } from '../../app/feedback-state'
import { LoadFailure } from '../ui/LoadFailure'

type ReplyRead = FeedbackState['reply']

/**
 * The line that says where the team replies, once the read of the reply
 * address is ready, with or without an address. While the read runs, a
 * spinner takes the place of its icon, so the line keeps its place. A
 * failed read has no line: its notice follows the lines.
 */
function ReplyLine(props: { reply: ReplyRead }) {
  const theme = useSharedUiTheme()
  const { reply } = props
  if (reply?.state === 'failed') return null
  if (reply === null || reply.state === 'loading') {
    return (
      <li className={styles.fact}>
        <span className={styles.factSpinner}>
          <Spinner color={theme.colors.muted} size={13} />
        </span>
        <span>{replyLoadingLine}</span>
      </li>
    )
  }
  const email = reply.value.replyEmail
  return (
    <li className={styles.fact}>
      <Reply aria-hidden className={styles.factIcon} size={14} />
      <span>{email === null ? noReplyLine : replyLine(email)}</span>
    </li>
  )
}

/**
 * What the message also carries, and where the team replies. A read of the
 * reply address that failed shows the notice of every read that failed,
 * with the message of the error and Try again, which reads it again.
 */
export function FeedbackFacts(props: {
  reply: ReplyRead
  phone: boolean
  readReply: () => Promise<void>
}) {
  const { reply } = props
  return (
    <>
      <ul
        aria-live="polite"
        className={classes(styles.facts, props.phone && styles.phone)}
      >
        <li className={styles.fact}>
          <Info aria-hidden className={styles.factIcon} size={14} />
          <span>{contextLine}</span>
        </li>
        <ReplyLine reply={reply} />
      </ul>
      {reply?.state === 'failed' ? (
        <LoadFailure
          error={reply.error}
          retry={props.readReply}
          title={replyNotLoadedTitle}
        />
      ) : null}
    </>
  )
}
