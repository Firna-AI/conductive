import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Reply } from 'lucide-react'
import { LoadFailure } from '../common/LoadFailure'
import {
  noReplyLine,
  replyLine,
  replyLoadingLine,
  replyNotLoadedTitle,
} from './feedbackCopy'
import styles from './FeedbackDialog.module.css'

/**
 * The read of the reply address, which Send waits for: it runs, it failed,
 * or it is ready. A ready read holds the primary verified email of the
 * GitHub account, or none, which still lets the person send.
 */
export type FeedbackReply =
  | { state: 'loading' }
  | { state: 'failed' }
  | { state: 'ready'; email: string | null }

/**
 * The line under the context line that says where the team replies. While
 * the read runs, a spinner takes the place of its icon, so the line keeps
 * its place when the address arrives. A failed read has no line, because
 * its notice follows the lines.
 */
export function ReplyLine(props: { reply: FeedbackReply }) {
  const theme = useSharedUiTheme()
  const { reply } = props
  switch (reply.state) {
    case 'failed':
      return null
    case 'loading':
      return (
        <li className={styles.fact}>
          <span className={styles.factSpinner}>
            <Spinner color={theme.colors.muted} size={13} />
          </span>
          <span>{replyLoadingLine}</span>
        </li>
      )
    case 'ready':
      return (
        <li className={styles.fact}>
          <Reply aria-hidden className={styles.factIcon} size={14} />
          <span>
            {reply.email === null ? noReplyLine : replyLine(reply.email)}
          </span>
        </li>
      )
  }
}

/**
 * The notice of a read that failed, after the lines and beside Send, which
 * waits for the read. It names what failed and gives the message of the
 * server and Try again, which reads the address again. `retryTo` is the
 * screen that Try again leads to, when the mockups draw it.
 */
export function ReplyFailure(props: {
  reply: FeedbackReply
  retryTo?: string
}) {
  if (props.reply.state !== 'failed') return null
  return <LoadFailure title={replyNotLoadedTitle} to={props.retryTo} />
}
