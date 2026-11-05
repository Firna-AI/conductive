import { MockLink } from '@mokly/mokly'
import { CircleAlert, Settings } from 'lucide-react'
import { IconButton } from '../common/actions'
import type { WorkspaceGroup } from './groups'
import { WorkspaceRowView } from './WorkspaceRow'
import styles from './WorkspaceGroups.module.css'

function SettingsLink(props: { name: string; to?: string }) {
  const button = (
    <IconButton icon={Settings} label={`Settings for ${props.name}`} quiet />
  )
  if (!props.to) return button
  return (
    <MockLink asChild to={props.to}>
      {button}
    </MockLink>
  )
}

/**
 * The workspaces of each repository under a plain section label. The
 * sidebar uses compact rows; the list page uses taller rows for touch.
 */
export function WorkspaceGroups(props: {
  groups: readonly WorkspaceGroup[]
  variant: 'sidebar' | 'page'
}) {
  return (
    <div className={styles.groups}>
      {props.groups.map((group) => {
        const name = group.repository.name
        return (
          <section
            aria-label={`Workspaces in ${name}`}
            className={styles.group}
            key={group.repository.key}
          >
            <div className={styles.header}>
              <h3 className={styles.name}>{name}</h3>
              {group.repository.base === 'failed' ? (
                <CircleAlert
                  aria-hidden={false}
                  aria-label="The base update failed"
                  className={styles.alert}
                  role="img"
                  size={13}
                />
              ) : null}
              <SettingsLink name={name} to={group.settingsTo} />
            </div>
            <ul className={styles.rows}>
              {group.rows.map((row) => (
                <li key={row.workspace.key}>
                  <WorkspaceRowView row={row} variant={props.variant} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
