import type { ReactNode } from 'react'
import styles from './AppFrame.module.css'

/** The desktop app: the workspace sidebar beside the main area. */
export function AppFrame(props: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <aside className={styles.sidebar}>{props.sidebar}</aside>
      <main className={styles.main}>{props.children}</main>
    </div>
  )
}

/** The mobile app: one full-height column. */
export function MobileFrame(props: { children: ReactNode }) {
  return <main className={styles.mobile}>{props.children}</main>
}
