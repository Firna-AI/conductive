import type { ReactNode } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import { classes } from '../common/classes'
import { endpointReadCopy as copy } from './endpointReadCopy'
import styles from './EndpointRead.module.css'

/**
 * The note under the kind and the host of a Codex own endpoint login after
 * a save that added `/v1` to the typed address, because only that address
 * lists the models. The account shows only the host, so the note says that
 * the saved address differs from the typed one. The page keeps it until it
 * reloads, and a later save or Remove clears it.
 */
export function EndpointAddressNote() {
  return (
    <p className={classes(styles.line, styles.note)} role="status">
      <Info aria-hidden className={styles.icon} size={14} />
      <span className={styles.words}>{copy.addedV1}</span>
    </p>
  )
}

/**
 * The warning under the kind and the host of an own endpoint login after
 * a save or a Refresh whose model list read failed, then `refresh`, the
 * Refresh button of the login, which lines up with Remove. A read that works removes the
 * warning. When the row also shows the models that the last list leaves
 * out, the warning holds the one Refresh of the row.
 */
export function EndpointReadFailed(props: { refresh: ReactNode }) {
  return (
    <div className={classes(styles.line, styles.warning)}>
      <p className={styles.message} role="status">
        <TriangleAlert aria-hidden className={styles.icon} size={14} />
        <span className={styles.words}>{copy.readFailed}</span>
      </p>
      {props.refresh}
    </div>
  )
}
