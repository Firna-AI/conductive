import type { FilesNavigation, FilesTarget } from '../navigation'
import { FilesLink } from './FilesLink'
import { classes } from './classes'
import styles from './LinkTabs.module.css'

/**
 * The key of the command that a tab runs, as the app shows it in the
 * tooltip of the tab and names it to a screen reader.
 */
export interface CommandKey {
  /** The tooltip, with the label and the key, such as "Changes (⌥⌘U)". */
  readonly title: string
  /** The key for `aria-keyshortcuts`, such as `Alt+Meta+U`. */
  readonly aria: string
}

export interface LinkTab {
  label: string
  to: FilesTarget
  /** A count after the label, such as the number of changed files. */
  count?: number
  selected: boolean
  commandKey?: CommandKey
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
          aria-keyshortcuts={tab.commandKey?.aria}
          className={classes(styles.tab, tab.selected && styles.selected)}
          key={tab.label}
          navigation={props.navigation}
          title={tab.commandKey?.title}
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
