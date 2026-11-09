import { CalendarCheck } from 'lucide-react'
import { parityPageCopy } from '../../../../../src/marketing/from-conductor/copy'
import { dayWords } from '../../../../../src/marketing/from-conductor/dates'
import type {
  ComingFeature,
  ParityStatus,
} from '../../../../../src/marketing/from-conductor/model'
import { parityStatuses } from '../../../../../src/marketing/from-conductor/statuses'
import { classes } from '../common/classes'
import { siteIcons } from '../marketing/siteIcons'
import styles from './ParityMarks.module.css'

/**
 * A status as its icon and its word, so that the status never depends on
 * colour alone. The site needs a larger mark than the dense `StatusText` of
 * the app.
 */
export function StatusMark(props: { status: ParityStatus }) {
  const status = parityStatuses[props.status]
  const Icon = siteIcons[status.icon]
  return (
    <span className={classes(styles.mark, styles[status.tone])}>
      <Icon aria-hidden className={styles.icon} size={15} />
      {status.label}
    </span>
  )
}

/**
 * The due day of a feature that is on the way, or "No date yet" when the
 * team has recorded no dated commitment for it.
 */
export function DueDay(props: { feature: ComingFeature }) {
  const { due } = props.feature
  if (due === null) {
    return (
      <span className={classes(styles.due, styles.undated)}>
        {parityPageCopy.noDate}
      </span>
    )
  }
  return (
    <span className={styles.due}>
      <CalendarCheck aria-hidden className={styles.dueIcon} size={13} />
      {parityPageCopy.due} <time dateTime={due}>{dayWords(due, 'short')}</time>
    </span>
  )
}
