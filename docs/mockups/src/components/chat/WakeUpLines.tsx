import type { ReactNode } from 'react'
import { AlarmClock, AlarmClockOff, ClockAlert } from 'lucide-react'
import { wakeUpLead } from './wakeUpCopy'
import lineStyles from './StopLine.module.css'
import styles from './WakeUpLines.module.css'

/**
 * The line of the app that a wake-up adds at its time: the alarm icon, the
 * fixed lead, then the text that the agent set. `text` draws that text as
 * the chat draws the text of a message, with its code and its chips, and
 * the line keeps its line breaks. The line starts a turn of the session, or
 * joins the turn that runs, and it is not a message of a member. The chat
 * centres it, as its other event lines. It takes no fixtures, so the app
 * can use it too.
 */
export function WakeUpLine(props: { text: ReactNode }) {
  return (
    <p className={lineStyles.line}>
      <AlarmClock aria-hidden className={lineStyles.icon} size={13} />
      <span>
        {wakeUpLead} <span className={styles.text}>{props.text}</span>
      </span>
    </p>
  )
}

/** How a pending wake-up ended with no turn. */
export type WakeUpEnd = 'cancelled' | 'not-started'

const endIcons = { cancelled: AlarmClockOff, 'not-started': ClockAlert }

/**
 * The line of a pending wake-up that ended with no turn, at the place of
 * its end: a Cancel, with the alarm that is off, or a time at which it
 * could start no turn, with the clock alert. `text` holds the words of
 * `wakeUpCopy.ts`. The line starts no turn and never folds. The chat
 * centres it, as its other event lines, and a narrow chat wraps it into
 * balanced lines. It takes no fixtures, so the app can use it too.
 */
export function WakeUpEndLine(props: { end: WakeUpEnd; text: string }) {
  const Icon = endIcons[props.end]
  return (
    <p className={lineStyles.line}>
      <Icon aria-hidden className={lineStyles.icon} size={13} />
      <span>{props.text}</span>
    </p>
  )
}
