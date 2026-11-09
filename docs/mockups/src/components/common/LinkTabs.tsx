import { ScreenLink } from './ScreenLink'
import { classes } from './classes'
import styles from './LinkTabs.module.css'

export type LinkTab = {
  label: string
  to: string
  /** A count after the label, such as the number of changed files. */
  count?: number
  selected: boolean
}

/**
 * A row of tabs. Each tab is a link to the screen that shows it. `wrap`
 * puts the tabs in three columns on as many lines as they need, so that
 * every tab shows. `flow` keeps the tabs on one line while they fit, and
 * moves the rest to a second line.
 */
export function LinkTabs(props: {
  label: string
  tabs: readonly LinkTab[]
  wrap?: boolean
  flow?: boolean
}) {
  return (
    <nav
      aria-label={props.label}
      className={classes(
        styles.tabs,
        props.wrap && styles.wrap,
        props.flow && styles.flow,
      )}
    >
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
