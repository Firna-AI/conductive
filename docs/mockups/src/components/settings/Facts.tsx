import type { ReactNode } from 'react'
import styles from './Facts.module.css'

export type Fact = { label: string; value: ReactNode }

/** Facts as label and value rows, such as the seats and the next invoice. */
export function Facts(props: { label: string; items: readonly Fact[] }) {
  return (
    <dl aria-label={props.label} className={styles.facts}>
      {props.items.map((item) => (
        <div className={styles.fact} key={item.label}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
