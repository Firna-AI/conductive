import { MockLink } from '@mokly/mokly'
import { chatTab, toolTabs, type ToolKey } from './tools'
import styles from './MobileTabBar.module.css'

const tabs = [chatTab, ...toolTabs]

/** The mobile workspace tabs: chat and each tool. */
export function MobileTabBar(props: { selected: ToolKey | 'chat' }) {
  return (
    <nav aria-label="Workspace" className={styles.bar}>
      {tabs.map((tab) => {
        const selected = tab.key === props.selected
        const Icon = tab.icon
        return (
          <MockLink
            aria-current={selected ? 'page' : undefined}
            className={
              selected ? `${styles.tab} ${styles.selected}` : styles.tab
            }
            key={tab.key}
            to={tab.to}
          >
            <span className={styles.icon}>
              <Icon size={20} />
            </span>
            {tab.label}
          </MockLink>
        )
      })}
    </nav>
  )
}
