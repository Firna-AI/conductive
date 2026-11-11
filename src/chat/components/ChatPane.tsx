import { useRef, type ReactNode } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/chat/ChatPane.module.css'
import local from './chat.module.css'
import { ChatKeeper, useReadingPlace } from './reading-place'

/**
 * The chat column: the transcript, which keeps the newest message in view,
 * with the notices and the composer or the sandbox bar under it. `empty`
 * takes the place of the transcript, such as for a new session. While the
 * reader is scrolled up, the row that they read keeps its place for every
 * change of size of the transcript, and the folds use the same keeper.
 * `session` names the shown session. Each session gets a box of its own,
 * so it opens at its newest message, also after the reader scrolled up in
 * another session.
 */
export function ChatPane(props: {
  mobile: boolean
  session: string | null
  empty?: ReactNode
  children?: ReactNode
  footer: ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const transcript = useRef<HTMLDivElement>(null)
  const shown = props.empty ? null : (props.session ?? '')
  const keeper = useReadingPlace(scroller, transcript, shown)
  return (
    <section
      aria-label="Chat"
      className={classes(styles.chat, props.mobile && styles.mobile)}
    >
      {shown === null ? (
        <div className={styles.empty}>{props.empty}</div>
      ) : (
        <div
          className={classes(styles.scroll, local.keptScroll)}
          key={shown}
          ref={scroller}
        >
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
