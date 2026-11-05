import styles from './DiffStat.module.css'

/** The lines that a change adds and removes, such as "+38 −6". */
export function DiffStat(props: { added: number; removed: number }) {
  return (
    <span
      aria-label={`${props.added} lines added, ${props.removed} removed`}
      className={styles.stat}
      role="img"
    >
      <span className={styles.added}>+{props.added}</span>
      {props.removed > 0 ? (
        <span className={styles.removed}>−{props.removed}</span>
      ) : null}
    </span>
  )
}
