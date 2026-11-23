import { CircleSlash } from 'lucide-react'
import { classes } from '../common/classes'
import { lostText, type LostReason, type LostWhat } from './lostCopy'
import styles from './LostLine.module.css'

/**
 * The line of a runner event that the workspace refused: one line at the
 * place of the event in the chat, which names the lost data and why. It
 * shows none of the lost data. The chat centres it, as its other event
 * lines. Among the steps of an open fold it starts at the left edge, as
 * the other steps do.
 */
export function LostLine(props: {
  what: LostWhat
  reason: LostReason
  align?: 'center' | 'start'
}) {
  return (
    <p
      className={classes(styles.line, props.align === 'start' && styles.start)}
    >
      <CircleSlash aria-hidden className={styles.icon} size={13} />
      <span>{lostText(props.what, props.reason)}</span>
    </p>
  )
}
