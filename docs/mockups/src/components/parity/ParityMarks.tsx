import { CalendarCheck } from 'lucide-react'
import type {
  ParityFeature,
  ParityStatus,
} from '../../fixtures/conductorParity'
import { classes } from '../common/classes'
import { dayWords, isComing, parityStatuses } from './parityStatus'
import styles from './ParityMarks.module.css'

/**
 * A status as its icon and its word, so that the status never depends on
 * colour alone. The site needs a larger mark than the dense `StatusText` of
 * the app.
 */
export function StatusMark(props: { status: ParityStatus }) {
  const words = parityStatuses[props.status]
  const Icon = words.icon
  return (
    <span className={classes(styles.mark, styles[words.tone])}>
      <Icon aria-hidden className={styles.icon} size={15} />
      {words.label}
    </span>
  )
}

/**
 * The due day of a feature that is on the way, or "No date yet". A feature
 * that is not on the way shows nothing, because it has no due day.
 */
export function DueDay(props: {
  feature: ParityFeature
  length?: 'long' | 'short'
}) {
  const { feature } = props
  if (!isComing(feature)) return null
  if (feature.due === null) {
    return (
      <span className={classes(styles.due, styles.undated)}>No date yet</span>
    )
  }
  return (
    <span className={styles.due}>
      <CalendarCheck aria-hidden className={styles.dueIcon} size={13} />
      Due{' '}
      <time dateTime={feature.due}>
        {dayWords(feature.due, props.length ?? 'short')}
      </time>
    </span>
  )
}
