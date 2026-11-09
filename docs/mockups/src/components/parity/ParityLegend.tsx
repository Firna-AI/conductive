import type { Viewport } from '@mokly/mokly'
import { CalendarCheck } from 'lucide-react'
import { classes } from '../common/classes'
import { StatusMark } from './ParityMarks'
import { dueRule, parityStatuses, statusOrder } from './parityStatus'
import styles from './ParityLegend.module.css'

/**
 * What each status means, and the rule of the due days, so that a visitor
 * can read a status and a date apart.
 */
export function ParityLegend(props: { viewport: Viewport }) {
  return (
    <section
      aria-labelledby="legend-title"
      className={classes(
        styles.legend,
        props.viewport === 'mobile' && styles.mobile,
      )}
    >
      <h2 className={styles.title} id="legend-title">
        How to read the list
      </h2>
      <dl className={styles.items}>
        {statusOrder.map((status) => (
          <div className={styles.item} key={status}>
            <dt>
              <StatusMark status={status} />
            </dt>
            <dd className={styles.meaning}>{parityStatuses[status].meaning}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.rule}>
        <CalendarCheck aria-hidden className={styles.ruleIcon} size={15} />
        {dueRule}
      </p>
    </section>
  )
}
