import { turnCopy } from '../../../../../src/shared/transcript/turn-words'
import type { ReactNode } from 'react'
import { Link2 } from 'lucide-react'
import styles from './LinkedLine.module.css'

/**
 * The first line of a linked session. A member's message in another
 * session opened it, because the login of the starter of that session was
 * not available, or that starter did not let other members use it. `link`
 * leads to that session, with its title as the text. The line gives the
 * link its colour.
 */
export function LinkedLine(props: { link: ReactNode }) {
  return (
    <p className={styles.line}>
      <Link2 aria-hidden className={styles.icon} size={13} />
      <span>
        {turnCopy.source} {props.link}
      </span>
    </p>
  )
}
