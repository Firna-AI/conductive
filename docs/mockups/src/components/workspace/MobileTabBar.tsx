import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../../../../../src/ui/components/common/classes'
import { mobileTabs, tabPage, type MobileTabKey } from './tools'
import styles from '../../../../../src/ui/components/workspace/MobileTabBar.module.css'

/**
 * The workspace tabs of a phone: the chat, the files, and each tool that
 * the app offers. In the phone apps a tab opens the page of the phone
 * apps, where it has one, such as the Preview tool.
 */
export function MobileTabBar(props: {
  selected: MobileTabKey
  phoneApp?: boolean
}) {
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
            to={tabPage(tab, props.phoneApp ?? false)}
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
