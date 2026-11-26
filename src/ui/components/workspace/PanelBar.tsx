import type { ReactNode } from 'react'
import styles from './PanelBar.module.css'

/** The bar at the top of a panel: its tabs, then its actions at the end. */
export function PanelBar(props: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className={styles.bar}>
      {props.children}
      <span className={styles.spacer} />
      {props.actions}
    </div>
  )
}
