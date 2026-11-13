import type { LucideIcon } from 'lucide-react'
import { Plus, Repeat, Search, Settings } from 'lucide-react'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import type { Shortcut } from '../common/KeyChips'
import { useMacApp } from '../mac/MacApp'
import styles from './SidebarLinks.module.css'

/**
 * The cog that links to the settings of the org. Its tooltip and its hidden
 * text say Settings. A dot says that something there needs the user, such
 * as a failed build of the cloud computer. `to` is the page of the
 * settings, such as those of a suspended org.
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
      title="Settings"
      to={props.to ?? paths.orgSettings}
    >
      <Settings aria-hidden size={15} />
      {props.alert ? <span aria-hidden className={styles.alert} /> : null}
      <span className={a11y.hidden}>
        Settings{props.alert ? ', a build failed' : null}
      </span>
    </ScreenLink>
  )
}

/** Where a link of the org sits: the desktop sidebar, or the list page. */
type LinkVariant = 'sidebar' | 'page'

/** A row at the top of the workspace list that opens a page of the org. */
function OrgPageLink(props: {
  to: string
  icon: LucideIcon
  label: string
  current?: boolean
  variant: LinkVariant
}) {
  const Icon = props.icon
  return (
    <ScreenLink
      aria-current={props.current ? 'page' : undefined}
      className={classes(
        styles.row,
        props.variant === 'page' && styles.page,
        props.current && styles.selected,
      )}
      to={props.to}
    >
      <Icon aria-hidden className={styles.icon} size={14} />
      {props.label}
    </ScreenLink>
  )
}

/** The row at the top of the workspace list that starts a new workspace. */
export function NewWorkspaceLink(props: {
  current?: boolean
  variant: LinkVariant
  to?: string
}) {
  return (
    <OrgPageLink
      current={props.current}
      icon={Plus}
      label="New workspace"
      to={props.to ?? paths.newWorkspace}
      variant={props.variant}
    />
  )
}

/**
 * The row below New workspace that opens the routines of the org. `to` is
 * the page of the routines, such as those of a suspended org.
 */
export function RoutinesLink(props: {
  current?: boolean
  variant: LinkVariant
  to?: string
}) {
  return (
    <OrgPageLink
      current={props.current}
      icon={Repeat}
      label="Routines"
      to={props.to ?? paths.routines}
      variant={props.variant}
    />
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
      className={classes(styles.row, props.variant === 'page' && styles.page)}
      to={mac ? paths.macPalette : paths.palette}
    >
      <Search aria-hidden className={styles.icon} size={14} />
      Search
      {props.shortcut ? (
        <kbd className={styles.keys}>{props.shortcut}</kbd>
      ) : null}
    </ScreenLink>
  )
}
