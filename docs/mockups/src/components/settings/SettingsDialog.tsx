import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '../common/actions'
import { SettingsNav, type SettingsNavGroup } from './SettingsNav'
import styles from '../../../../../src/ui/components/settings/SettingsDialog.module.css'

/**
 * Settings on a desktop: a large dialog over the whole window, the rail and
 * the sidebar too. The list of the tabs, in an Account group and a group of
 * the org, fills its left column. The open tab fills the rest, under a bar
 * with its name, its group, and Close. Close and Esc return to the page
 * below. The dialog lies in the `overlay` of `AppFrame`, below the
 * dialogs that a tab opens, such as Delete org.
 */
export function SettingsDialog(props: {
  groups: readonly SettingsNavGroup[]
  /** The name of the open tab, such as Agents. */
  title: string
  /** The group of the open tab: Account, or the name of the org. */
  group: string
  children: ReactNode
}) {
  return (
    <div className={styles.layer}>
      <div aria-hidden className={styles.scrim} />
      <section aria-label="Settings" className={styles.dialog} role="dialog">
        <div className={styles.side}>
          <div className={styles.heading}>Settings</div>
          <SettingsNav groups={props.groups} variant="panel" />
        </div>
        <div className={styles.main}>
          <header className={styles.bar}>
            <div className={styles.titles}>
              <h1 className={styles.title}>{props.title}</h1>
              <span className={styles.group}>{props.group}</span>
            </div>
            <IconButton icon={X} label="Close" />
          </header>
          <div className={styles.body}>
            <div className={styles.column}>{props.children}</div>
          </div>
        </div>
      </section>
    </div>
  )
}
