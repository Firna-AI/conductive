import { CircleSlash } from 'lucide-react'
import { lostText, type LostReason, type LostWhat } from './lostCopy'
import styles from './LostLine.module.css'

/**
 * The line of a runner event that the workspace refused: one line at the
 * place of the event in the chat, which names the lost data and why. It
 * shows none of the lost data.
 */
export function LostLine(props: { what: LostWhat; reason: LostReason }) {
  return (
    <p className={styles.line}>
      <CircleSlash aria-hidden className={styles.icon} size={13} />
      <span>{lostText(props.what, props.reason)}</span>
    </p>
  )
}
