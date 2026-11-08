import type { ReactNode } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/chat/ChatPane.module.css'

/**
 * The chat column: the transcript, which keeps the newest message in view,
 * with the notices and the composer or the sandbox bar under it. `empty`
 * takes the place of the transcript, such as for a new session.
 */
export function ChatPane(props: {
  mobile: boolean
  empty?: ReactNode
  children?: ReactNode
  footer: ReactNode
}) {
  return (
    <section
      aria-label="Chat"
      className={classes(styles.chat, props.mobile && styles.mobile)}
    >
      {props.empty ? (
        <div className={styles.empty}>{props.empty}</div>
      ) : (
        <div className={styles.scroll}>
          <div className={styles.transcript}>{props.children}</div>
        </div>
      )}
      <div className={styles.footer}>{props.footer}</div>
    </section>
  )
}
