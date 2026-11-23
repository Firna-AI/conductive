import type { ReactNode } from 'react'
import { AlarmClock } from 'lucide-react'
import { pendingWakeUpTitle, wakeUpWords } from './wakeUpCopy'
import chat from './ChatPane.module.css'
import styles from './PendingWakeUps.module.css'

/**
 * The pending wake-ups of a session, soonest first. The chat keeps them in
 * view at the top of its footer: above the requests that wait for an
 * answer, and above the composer, or above the bar of a cloud computer
 * that does not run. A pending wake-up waits for no member, so the
 * workspace shows no Needs input for it. The group scrolls as the region
 * of the requests does, and an edge that cuts a card fades out. It takes
 * no fixtures, so the app can use it too.
 */
export function PendingWakeUps(props: { children: ReactNode }) {
  return (
    <div aria-label={wakeUpWords.region} className={chat.requests} role="group">
      {props.children}
    </div>
  )
}

/**
 * One pending wake-up, as a compact card: the alarm icon, its time in the
 * local time of the reader, and Cancel, then the text that the agent set.
 * `time` holds the words of `wakeUpTime`. `text` draws the text as the chat
 * draws the text of a message. Closed, the text shows two lines, and a
 * press shows all of it, as a message line in the work of a turn does.
 * `cancel` is the Cancel control, which each member can press. A read-only
 * workspace gives none. It takes no fixtures, so the app can use it too.
 */
export function PendingWakeUp(props: {
  time: string
  text: ReactNode
  cancel?: ReactNode
  /** The whole text shows, as after a press on it. */
  open?: boolean
}) {
  const title = pendingWakeUpTitle(props.time)
  return (
    <section aria-label={title} className={styles.wakeUp}>
      <div className={styles.head}>
        <AlarmClock aria-hidden className={styles.icon} size={14} />
        <span className={styles.title}>{title}</span>
        {props.cancel ? (
          <span className={styles.end}>{props.cancel}</span>
        ) : null}
      </div>
      <details className={styles.more} open={props.open}>
        <summary className={styles.text}>{props.text}</summary>
      </details>
    </section>
  )
}
