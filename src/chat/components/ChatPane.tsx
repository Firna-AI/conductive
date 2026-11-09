import { useRef, type ReactNode } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/chat/ChatPane.module.css'
import { ChatKeeper, useReadingPlace } from './reading-place'

/**
 * The chat column: the transcript, which keeps the newest message in view,
 * with the notices and the composer or the sandbox bar under it. `empty`
 * takes the place of the transcript, such as for a new session. While the
 * reader is scrolled up, the row that they read keeps its place for every
 * change of size of the transcript, and the folds use the same keeper.
 */
export function ChatPane(props: {
  mobile: boolean
  empty?: ReactNode
  children?: ReactNode
  footer: ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const transcript = useRef<HTMLDivElement>(null)
  const keeper = useReadingPlace(scroller, transcript, !props.empty)
  return (
    <section
      aria-label="Chat"
      className={classes(styles.chat, props.mobile && styles.mobile)}
    >
      {props.empty ? (
        <div className={styles.empty}>{props.empty}</div>
      ) : (
        <div className={styles.scroll} ref={scroller}>
          <ChatKeeper.Provider value={keeper}>
            <div className={styles.transcript} ref={transcript}>
              {props.children}
            </div>
          </ChatKeeper.Provider>
        </div>
      )}
      <div className={styles.footer}>{props.footer}</div>
    </section>
  )
}
