import tabScroll from '../workspace/TabScroll.module.css'
import { ScreenLink } from './ScreenLink'
import { classes } from './classes'
import styles from './LinkTabs.module.css'

export type LinkTab = {
  label: string
  /** The screen of the tab. A tab without one stays static. */
  to?: string
  /** A count after the label, such as the number of changed files. */
  count?: number
  /**
   * The tooltip of a tab whose label is cut, which is also its spoken name,
   * such as the full name of the server of a preview.
   */
  title?: string
  selected: boolean
}

/**
 * A row of tabs. Each tab is a link to the screen that shows it, or static
 * when the mockups draw no such screen. `wrap`
 * puts the tabs in three columns on as many lines as they need, so that
 * every tab shows. `flow` keeps the tabs on one line while they fit, and
 * moves the rest to a second line. `fadeEnd` marks a row that clips tabs at
 * its end with the fade of the centre tab row. A view runs no script, so
 * the screen says when its row clips.
 */
export function LinkTabs(props: {
  label: string
  tabs: readonly LinkTab[]
  wrap?: boolean
  flow?: boolean
  fadeEnd?: boolean
}) {
  return (
    <nav
      aria-label={props.label}
      className={classes(
        styles.tabs,
        props.wrap && styles.wrap,
        props.flow && styles.flow,
        props.fadeEnd && tabScroll.fadeEnd,
      )}
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
        if (tab.to === undefined) {
          return (
            <span
              aria-current={tab.selected ? 'page' : undefined}
              className={className}
              key={tab.label}
              title={tab.title}
            >
              {content}
            </span>
          )
        }
        return (
          <ScreenLink
            aria-current={tab.selected ? 'page' : undefined}
            aria-label={tab.title}
            className={className}
            key={tab.label}
            title={tab.title}
            to={tab.to}
          >
            {content}
          </ScreenLink>
        )
      })}
    </nav>
  )
}
