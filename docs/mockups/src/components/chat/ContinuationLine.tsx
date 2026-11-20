import { CirclePlay } from 'lucide-react'
import { continuationText, type ContinuationNext } from './continuationCopy'
import styles from './LinkedLine.module.css'

/**
 * The line of the app after a turn that the cloud computer stopped while
 * the agent worked: what comes next. It sits under the stopped line of that
 * turn, and a continuation turn starts after it. The play icon answers the
 * stop icon of the line above. It is centred and muted, as the other event
 * lines of the chat, and a narrow chat wraps it into balanced lines. It
 * takes no fixtures, so the app can use it too.
 */
export function ContinuationLine(props: { next: ContinuationNext }) {
  return (
    <p className={styles.line}>
      <CirclePlay aria-hidden className={styles.icon} size={13} />
      <span>{continuationText(props.next)}</span>
    </p>
  )
}
