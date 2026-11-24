import { formatCount } from '../../ui/components/common/counts'
import styles from './DiffStat.module.css'

/**
 * The lines that a change adds and removes, such as "+38 −6", with
 * thousands separators, such as "+55,866 −17,843". A deleted file shows
 * only the lines that it removes.
 */
export function DiffStat(props: { added: number; removed: number }) {
  const added = formatCount(props.added)
  const removed = formatCount(props.removed)
  return (
    <span
      aria-label={`${added} lines added, ${removed} removed`}
      className={styles.stat}
      role="img"
    >
      {props.added > 0 || props.removed === 0 ? (
        <span className={styles.added}>+{added}</span>
      ) : null}
      {props.removed > 0 ? (
        <span className={styles.removed}>−{removed}</span>
      ) : null}
    </span>
  )
}
