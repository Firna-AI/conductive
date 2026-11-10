import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { mobileTabs, type MobileTabKey } from './tools'
import styles from './MobileTabBar.module.css'

/**
 * The workspace tabs of a phone: the chat, the files, and each tool that
 * the app offers. `links` gives the screens of the tabs for the workspace
 * that owns the bar, when they are not the screens of every workspace. A
 * tab without a screen there, or with null, stays static.
 */
export function MobileTabBar(props: {
  selected: MobileTabKey
  links?: Readonly<Partial<Record<MobileTabKey, string | null>>>
}) {
  return (
    <nav aria-label="Workspace" className={styles.bar}>
      {mobileTabs.map((tab) => {
        const selected = tab.key === props.selected
        const Icon = tab.icon
        const to = (props.links ? props.links[tab.key] : tab.to) ?? undefined
        const className = classes(styles.tab, selected && styles.selected)
        const content = (
          <>
            <span className={styles.icon}>
              <Icon size={19} strokeWidth={selected ? 2.2 : 1.8} />
            </span>
            {tab.label}
          </>
        )
        if (to === undefined) {
          return (
            <span
              aria-current={selected ? 'page' : undefined}
              className={className}
              key={tab.key}
            >
              {content}
            </span>
          )
        }
        return (
          <ScreenLink
            aria-current={selected ? 'page' : undefined}
            className={className}
            key={tab.key}
            to={to}
          >
            {content}
          </ScreenLink>
        )
      })}
    </nav>
  )
}
