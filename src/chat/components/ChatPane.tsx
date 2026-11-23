import { useRef, type ReactNode, type Ref } from 'react'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/chat/ChatPane.module.css'
import { ToBottomButton } from '../../ui/components/chat/ToBottomButton'
import { NearViewRoot } from '../ui/near-view'
import type { PlaceMemory } from './chat-place'
import { ChatKeeper, useReadingPlace } from './reading-place'
import { useScrolledUp } from './scrolled-up'

/**
 * The chat column: the transcript, which keeps the newest message in view,
 * with the notices and the composer or the sandbox bar under it. `empty`
 * takes the place of the transcript, such as for a new session. While the
 * reader is scrolled up, the row that they read keeps its place for every
 * change of size of the transcript, and the folds use the same keeper. The
 * scroll box is the view that the pictures of the answers come near.
 * Each new ID in `sent`, a message that the user sent from this chat, shows
 * the bottom of the chat. A message of another member does not move it.
 * `place` keeps the reader's place in the shown session while another tab
 * shows, and gives it back when the session shows again. While the reader
 * reads higher up, a round button above the footer shows the bottom.
 */
export function ChatPane({
  ref,
  ...props
}: {
  mobile: boolean
  empty?: ReactNode
  /** The IDs of the messages that this chat sent and that wait for a reply. */
  sent: readonly string[]
  /** The kept place of the shown session. */
  place?: PlaceMemory | null
  children?: ReactNode
  footer: ReactNode
  /** The name of the chat for screen readers, "Chat" by default. */
  label?: string
  /**
   * A small chat, such as the popover of an explanation, with less room
   * around its transcript and its footer, which fills its box.
   */
  compact?: boolean
  /** The element of the chat, such as for a sheet that stops at its top. */
  ref?: Ref<HTMLElement>
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
  const scrolledUp = useScrolledUp(scroller, !props.empty)
  return (
    <section
      aria-label={props.label ?? 'Chat'}
      className={classes(
        styles.chat,
        props.mobile && styles.mobile,
        props.compact && styles.compact,
      )}
      ref={ref}
    >
      {props.empty ? (
        <div className={styles.empty}>{props.empty}</div>
      ) : (
        <div className={styles.scroll} ref={scroller}>
          <ChatKeeper.Provider value={keeper}>
            <NearViewRoot.Provider value={scroller}>
              <div className={styles.transcript} ref={transcript}>
                {props.children}
              </div>
            </NearViewRoot.Provider>
          </ChatKeeper.Provider>
        </div>
      )}
      <div className={styles.footer}>
        {scrolledUp ? <ToBottomButton onPress={keeper.bottom} /> : null}
        {props.footer}
      </div>
    </section>
  )
}
