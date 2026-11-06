import type { FilesNavigation, FilesTarget } from '../navigation'
import { FilesLink } from './FilesLink'
import { classes } from './classes'
import styles from './LinkTabs.module.css'

export interface LinkTab {
  label: string
  to: FilesTarget
  /** A count after the label, such as the number of changed files. */
  count?: number
  selected: boolean
}

/** A row of tabs. Each tab is a link to the view that it shows. */
export function LinkTabs(props: {
  label: string
  tabs: readonly LinkTab[]
  navigation: FilesNavigation
}) {
  return (
    <nav aria-label={props.label} className={styles.tabs}>
      {props.tabs.map((tab) => (
        <FilesLink
          aria-current={tab.selected ? 'page' : undefined}
          className={classes(styles.tab, tab.selected && styles.selected)}
          key={tab.label}
          navigation={props.navigation}
          to={tab.to}
        >
          {tab.label}
          {tab.count === undefined ? null : (
            <span className={styles.count}>{tab.count}</span>
          )}
        </FilesLink>
      ))}
    </nav>
  )
}
