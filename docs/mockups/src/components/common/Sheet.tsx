import type { ReactNode } from 'react'
import styles from './Sheet.module.css'

/**
 * A sheet that rises from the bottom of a phone screen over a dimmed page,
 * for a menu that a phone opens in place of a desktop menu.
 */
export function Sheet(props: { title: string; children: ReactNode }) {
  return (
    <div className={styles.layer}>
      <div aria-hidden className={styles.scrim} />
      <section aria-label={props.title} className={styles.sheet} role="dialog">
        <span aria-hidden className={styles.handle} />
        <h2 className={styles.title}>{props.title}</h2>
        <div className={styles.body}>{props.children}</div>
      </section>
    </div>
  )
}
