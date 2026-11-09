import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { mobileTabs, type MobileTabKey } from './tools'
import styles from './MobileTabBar.module.css'

/**
 * The workspace tabs of a phone: the chat, the files, and each tool that
 * the app offers.
 */
export function MobileTabBar(props: { selected: MobileTabKey }) {
  return (
    <nav aria-label="Workspace" className={styles.bar}>
      {mobileTabs.map((tab) => {
        const selected = tab.key === props.selected
        const Icon = tab.icon
        return (
          <ScreenLink
            aria-current={selected ? 'page' : undefined}
            className={classes(styles.tab, selected && styles.selected)}
            key={tab.key}
            to={tab.to}
          >
            <span className={styles.icon}>
              <Icon size={19} strokeWidth={selected ? 2.2 : 1.8} />
            </span>
            {tab.label}
          </ScreenLink>
        )
      })}
    </nav>
  )
}
