import { useRef, type ReactNode } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/chat/ChatPane.module.css'
import type { PlaceMemory } from './chat-place'
import { ChatKeeper, useReadingPlace } from './reading-place'

/**
 * The chat column: the transcript, which keeps the newest message in view,
 * with the notices and the composer or the sandbox bar under it. `empty`
 * takes the place of the transcript, such as for a new session. While the
 * reader is scrolled up, the row that they read keeps its place for every
 * change of size of the transcript, and the folds use the same keeper.
 * Each new ID in `sent`, a message that the user sent from this chat, shows
 * the bottom of the chat. A message of another member does not move it.
 * `place` keeps the reader's place in the shown session while another tab
 * shows, and gives it back when the session shows again.
 */
export function ChatPane(props: {
  mobile: boolean
  empty?: ReactNode
  /** The IDs of the messages that this chat sent and that wait for a reply. */
  sent: readonly string[]
  /** The kept place of the shown session. */
  place?: PlaceMemory | null
  children?: ReactNode
  footer: ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const transcript = useRef<HTMLDivElement>(null)
  const keeper = useReadingPlace(
    scroller,
    transcript,
    !props.empty,
    props.sent,
    props.place,
  )
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
