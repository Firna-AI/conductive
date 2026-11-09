import { ScreenLink } from './ScreenLink'
import { classes } from './classes'
import styles from './LinkTabs.module.css'

export type LinkTab = {
  label: string
  /** The screen of the tab. A tab whose screen the mockups lack has none. */
  to?: string
  /** A count after the label, such as the number of changed files. */
  count?: number
  selected: boolean
}

/**
 * A row of tabs. Each tab is a link to the screen that shows it. `wrap`
 * puts the tabs in three columns on as many lines as they need, so that
 * every tab shows.
 */
export function LinkTabs(props: {
  label: string
  tabs: readonly LinkTab[]
  wrap?: boolean
}) {
  return (
    <nav
      aria-label={props.label}
      className={classes(styles.tabs, props.wrap && styles.wrap)}
    >
      {props.tabs.map((tab) => {
        const className = tab.selected
          ? `${styles.tab} ${styles.selected}`
          : styles.tab
        const content = (
          <>
            {tab.label}
            {tab.count === undefined ? null : (
              <span className={styles.count}>{tab.count}</span>
            )}
          </>
        )
        return tab.to ? (
          <ScreenLink
            aria-current={tab.selected ? 'page' : undefined}
            className={className}
            key={tab.label}
            to={tab.to}
          >
            {content}
          </ScreenLink>
        ) : (
          <span
            aria-current={tab.selected ? 'page' : undefined}
            className={className}
            key={tab.label}
          >
            {content}
          </span>
        )
      })}
    </nav>
  )
}
