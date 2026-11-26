import type { ReactNode } from 'react'
import { BellRing } from 'lucide-react'
import type { TurnEndReason } from '../../../shared/generated/TurnEndReason'
import { wakeWords } from './wakeCopy'
import type { SessionWatchEndState } from '../../../shared/generated/SessionWatchEndState'
import styles from './StopLine.module.css'

/**
 * The line of the app that wakes this session when a turn that it watched
 * ends: the bell icon, the words of the end, the chip of the watched
 * session, then the end reason of that turn after a dot when its end names
 * one. The chip names the workspace of the session too. One icon marks each
 * end, because the icon of a stop or of an error would read as an end of a
 * turn of this session. The line starts a turn of this session, or joins
 * the turn that runs, and it is not a message of a member. The chat centres
 * it, as its other event lines. A narrow chat wraps it into balanced lines,
 * and the chip moves to the next line whole. It takes no fixtures, so the
 * app can use it too.
 */
export function WakeLine(props: {
  end: SessionWatchEndState
  reason?: TurnEndReason
  session: ReactNode
}) {
  const words = wakeWords(props.end, props.reason)
  return (
    <p className={styles.line}>
      <BellRing aria-hidden className={styles.icon} size={13} />
      <span>
        {words.lead} {props.session}
        {words.notes.map((note) => ` · ${note}`).join('')}
      </span>
    </p>
  )
}
