import type { ReactNode } from 'react'
import styles from './TabIntro.module.css'

/** The heading of a settings tab, with one line about what it holds. */
export function TabIntro(props: { title: string; children: ReactNode }) {
  return (
    <div className={styles.intro}>
      <h2 className={styles.title}>{props.title}</h2>
      <p className={styles.text}>{props.children}</p>
    </div>
  )
}
