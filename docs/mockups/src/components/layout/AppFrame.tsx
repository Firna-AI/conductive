import type { ReactNode } from 'react'
import { IconRail } from './IconRail'
import styles from './AppFrame.module.css'

/**
 * The desktop app: the icon rail, the workspace sidebar, and the main area.
 * In a narrow window the sidebar hides, and the rail leads to the list.
 */
export function AppFrame(props: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <IconRail />
      <aside className={styles.sidebar}>{props.sidebar}</aside>
      <main className={styles.main}>{props.children}</main>
    </div>
  )
}

/** The mobile app: one full-height column. */
export function MobileFrame(props: { children: ReactNode }) {
  return <main className={styles.mobile}>{props.children}</main>
}
