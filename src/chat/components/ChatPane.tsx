import { useCallback, useRef, type ReactNode } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/chat/ChatPane.module.css'
import { ChatScroll } from './useFold'

/**
 * The chat column: the transcript, which keeps the newest message in view,
 * with the notices and the composer or the sandbox bar under it. `empty`
 * takes the place of the transcript, such as for a new session. The folds
 * of the transcript move it through `ChatScroll`, so that the line of a
 * fold keeps its place when the user opens or closes it.
 */
export function ChatPane(props: {
  mobile: boolean
  empty?: ReactNode
  children?: ReactNode
  footer: ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const scroll = useCallback((distance: number) => {
    if (scroller.current) scroller.current.scrollTop += distance
  }, [])
  return (
    <section
      aria-label="Chat"
      className={classes(styles.chat, props.mobile && styles.mobile)}
    >
      {props.empty ? (
        <div className={styles.empty}>{props.empty}</div>
      ) : (
        <div className={styles.scroll} ref={scroller}>
          <ChatScroll.Provider value={scroll}>
            <div className={styles.transcript}>{props.children}</div>
          </ChatScroll.Provider>
        </div>
      )}
      <div className={styles.footer}>{props.footer}</div>
    </section>
  )
}
