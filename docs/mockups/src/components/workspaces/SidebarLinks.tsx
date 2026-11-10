import { Plus, Search } from 'lucide-react'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import type { Shortcut } from '../common/KeyChips'
import { useMacApp } from '../mac/MacApp'
import styles from './SidebarLinks.module.css'

/**
 * The link to the settings of the org. A dot says that something there needs
 * the user, such as a failed build of the cloud computer. `to` is the page of
 * the settings, such as those of a suspended org.
 */
export function SettingsLink(props: {
  current?: boolean
  alert?: boolean
  to?: string
}) {
  return (
    <ScreenLink
      aria-current={props.current ? 'page' : undefined}
      className={classes(styles.settings, props.current && styles.current)}
      to={props.to ?? paths.orgSettings}
    >
      {props.alert ? <span aria-hidden className={styles.alert} /> : null}
      Settings
      {props.alert ? (
        <span className={a11y.hidden}>, a build failed</span>
      ) : null}
    </ScreenLink>
  )
}

/**
 * The row at the top of the workspace list that starts a new workspace.
 * `to` is the New workspace page of the org, such as that of a new org.
 */
export function NewWorkspaceLink(props: {
  current?: boolean
  variant: 'sidebar' | 'page'
  to?: string
}) {
  return (
    <ScreenLink
      aria-current={props.current ? 'page' : undefined}
      className={classes(
        styles.newWorkspace,
        props.variant === 'page' && styles.page,
        props.current && styles.selected,
      )}
      to={props.to ?? paths.newWorkspace}
    >
      <Plus aria-hidden className={styles.plus} size={14} />
      New workspace
    </ScreenLink>
  )
}

/**
 * The row under New workspace that opens the command palette. A desktop
 * shows its key, so the row teaches it. A phone has no key to show. In the
 * Mac app the row opens the palette of the Mac app, whose rows show the keys
 * of the Mac app.
 */
export function SearchLink(props: {
  variant: 'sidebar' | 'page'
  /** The key that opens the palette, such as ⌘K, or none. */
  shortcut?: Shortcut
}) {
  const mac = useMacApp()
  return (
    <ScreenLink
      className={classes(
        styles.newWorkspace,
        props.variant === 'page' && styles.page,
      )}
      to={mac ? paths.macPalette : paths.palette}
    >
      <Search aria-hidden className={styles.plus} size={14} />
      Search
      {props.shortcut ? (
        <kbd className={styles.keys}>{props.shortcut}</kbd>
      ) : null}
    </ScreenLink>
  )
}
