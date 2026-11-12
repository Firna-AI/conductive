import { Gauge } from 'lucide-react'
import { standardSpeedText, type StandardSpeedCause } from './speedCopy'
import styles from './TurnEnd.module.css'

/**
 * The note of a fast turn that ran at standard speed, in the end line of the
 * turn: muted text with a gauge icon, such as "Standard speed · Fast limit
 * reached". A narrow chat wraps it, and the icon stays on its first line. It
 * takes no fixtures, so the app can use it too.
 */
export function StandardSpeedNote(props: { cause: StandardSpeedCause }) {
  return (
    <span className={styles.speed}>
      <Gauge aria-hidden className={styles.icon} size={12} />
      <span>{standardSpeedText(props.cause)}</span>
    </span>
  )
}
