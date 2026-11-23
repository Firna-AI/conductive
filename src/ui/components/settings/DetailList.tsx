import type { ReactNode } from 'react'
import styles from './DetailList.module.css'

/**
 * One fact: its term, its value, and whether the value is code. A value
 * can hold a link, such as the owner of a referral code.
 */
export type Detail = { term: string; value: ReactNode; mono?: boolean }

/**
 * Facts as rows of a term and its value, in a box with a full outline,
 * such as a saved key or the read-only name of an org.
 */
export function DetailList(props: { rows: readonly Detail[] }) {
  return (
    <dl className={styles.details}>
      {props.rows.map((row) => (
        <div className={styles.row} key={row.term}>
          <dt className={styles.term}>{row.term}</dt>
          <dd className={row.mono ? styles.mono : styles.value}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
