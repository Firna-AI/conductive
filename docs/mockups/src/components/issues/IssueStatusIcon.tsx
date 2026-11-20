import type { IssuePriority, IssueStatus } from '../../fixtures/issues'
import { classes } from '../common/classes'
import { priorityLabels, statusLabels } from './issueCopy'
import styles from './IssueStatusIcon.module.css'

/** The share of the circle that each state fills, from 0 to 1. */
const fills: Readonly<Record<IssueStatus, number>> = {
  backlog: 0,
  todo: 0,
  'in-progress': 0.5,
  'in-review': 0.75,
  done: 1,
}

/** The path of a pie slice of the inner circle, from the top, clockwise. */
function slice(share: number): string {
  const angle = share * 2 * Math.PI
  const x = 6 + 3 * Math.sin(angle)
  const y = 6 - 3 * Math.cos(angle)
  const large = share > 0.5 ? 1 : 0
  return `M6 6 L6 3 A3 3 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`
}

/**
 * The state of an issue as a circle in the 12 px column of the list marks:
 * dashed for Backlog, empty for Todo, half full for In progress, three
 * quarters for In review, and full with a check for Done. Each state has
 * its own shape, so the state never depends on colour alone.
 */
export function IssueStatusIcon(props: { status: IssueStatus; size?: number }) {
  const { status } = props
  const size = props.size ?? 12
  const share = fills[status]
  return (
    <svg
      aria-label={statusLabels[status]}
      className={classes(styles.icon, styles[status])}
      height={size}
      role="img"
      viewBox="0 0 12 12"
      width={size}
    >
      {status === 'done' ? (
        <>
          <circle className={styles.filled} cx="6" cy="6" r="5.5" />
          <path className={styles.check} d="M3.6 6.2 L5.2 7.8 L8.4 4.4" />
        </>
      ) : (
        <>
          <circle
            className={classes(
              styles.ring,
              status === 'backlog' && styles.dashed,
            )}
            cx="6"
            cy="6"
            r="5"
          />
          {share > 0 ? <path className={styles.fill} d={slice(share)} /> : null}
        </>
      )}
    </svg>
  )
}

/** How many of the three bars each priority lights. */
const bars: Readonly<Record<IssuePriority, number>> = {
  urgent: 3,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
}

/**
 * The priority of an issue as three bars, or a filled square with a mark
 * for Urgent. No priority shows three faint dashes.
 */
export function PriorityIcon(props: { priority: IssuePriority }) {
  const { priority } = props
  if (priority === 'urgent') {
    return (
      <svg
        aria-label={priorityLabels[priority]}
        className={classes(styles.icon, styles.urgent)}
        height={12}
        role="img"
        viewBox="0 0 12 12"
        width={12}
      >
        <rect
          className={styles.filled}
          height="11"
          rx="2.5"
          width="11"
          x="0.5"
          y="0.5"
        />
        <path className={styles.check} d="M6 3 V6.6 M6 8.6 V8.8" />
      </svg>
    )
  }
  const lit = bars[priority]
  return (
    <svg
      aria-label={priorityLabels[priority]}
      className={classes(styles.icon, styles.priority)}
      height={12}
      role="img"
      viewBox="0 0 12 12"
      width={12}
    >
      {[0, 1, 2].map((bar) => (
        <rect
          className={bar < lit ? styles.bar : styles.barOff}
          height={priority === 'none' ? 1.5 : 3 + bar * 3}
          key={bar}
          rx="0.75"
          width="2.5"
          x={1 + bar * 3.75}
          y={priority === 'none' ? 5.25 : 9 - bar * 3}
        />
      ))}
    </svg>
  )
}
