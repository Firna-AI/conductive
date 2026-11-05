import { MockLink } from '@mokly/mokly'
import { Plus } from 'lucide-react'
import { paths } from '../../paths'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import styles from './SidebarLinks.module.css'

/**
 * The link to the settings of the org. A dot says that something there needs
 * the user, such as a failed build of the cloud computer.
 */
export function SettingsLink(props: { current?: boolean; alert?: boolean }) {
  return (
    <MockLink
      aria-current={props.current ? 'page' : undefined}
      className={classes(styles.settings, props.current && styles.current)}
      to={paths.orgSettings}
    >
      {props.alert ? <span aria-hidden className={styles.alert} /> : null}
      Settings
      {props.alert ? (
        <span className={a11y.hidden}>, a build failed</span>
      ) : null}
    </MockLink>
  )
}

/** The row at the top of the workspace list that starts a new workspace. */
export function NewWorkspaceLink(props: {
  current?: boolean
  variant: 'sidebar' | 'page'
}) {
  return (
    <MockLink
      aria-current={props.current ? 'page' : undefined}
      className={classes(
        styles.newWorkspace,
        props.variant === 'page' && styles.page,
        props.current && styles.selected,
      )}
      to={paths.newWorkspace}
    >
      <Plus aria-hidden className={styles.plus} size={14} />
      New workspace
    </MockLink>
  )
}
