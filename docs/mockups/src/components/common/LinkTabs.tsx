import { ScreenLink } from './ScreenLink'
import styles from './LinkTabs.module.css'

export type LinkTab = {
  label: string
  to: string
  /** A count after the label, such as the number of changed files. */
  count?: number
  selected: boolean
}

/** A row of tabs. Each tab is a link to the screen that shows it. */
export function LinkTabs(props: { label: string; tabs: readonly LinkTab[] }) {
  return (
    <nav aria-label={props.label} className={styles.tabs}>
      {props.tabs.map((tab) => (
        <ScreenLink
          aria-current={tab.selected ? 'page' : undefined}
          className={
            tab.selected ? `${styles.tab} ${styles.selected}` : styles.tab
          }
          key={tab.label}
          to={tab.to}
        >
          {tab.label}
          {tab.count === undefined ? null : (
            <span className={styles.count}>{tab.count}</span>
          )}
        </ScreenLink>
      ))}
    </nav>
  )
}
