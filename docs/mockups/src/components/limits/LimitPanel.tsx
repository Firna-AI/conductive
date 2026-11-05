import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Workspace } from '../../fixtures/workspaces'
import { ActionButton } from '../common/actions'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import { activityPresentation } from '../workspaces/status'
import a11y from '../common/a11y.module.css'
import styles from './LimitPanel.module.css'

/**
 * A limit that stops a start, in place of the empty chat of a new
 * workspace. The title gives the one way forward, the body names the
 * limit, and `children` holds the action, such as a list of workspaces.
 */
export function LimitPanel(props: {
  icon: LucideIcon
  title: string
  body: string
  children?: ReactNode
}) {
  const Icon = props.icon
  return (
    <section aria-label={props.title} className={styles.panel}>
      <Icon aria-hidden className={styles.icon} size={26} strokeWidth={1.5} />
      <h2 className={styles.title}>{props.title}</h2>
      <p className={styles.body}>{props.body}</p>
      {props.children}
    </section>
  )
}

/**
 * Workspaces, each with the one action that frees a place, such as Archive
 * or Stop. Each row shows the state, the name, and the time.
 */
export function WorkspaceActions(props: {
  label: string
  workspaces: readonly Workspace[]
  action: string
  icon: LucideIcon
}) {
  return (
    <ul aria-label={props.label} className={styles.list}>
      {props.workspaces.map((workspace) => (
        <li className={styles.row} key={workspace.key}>
          <StatusGlyph status={workspace.status} />
          <span className={styles.name}>{workspace.name}</span>
          <span className={styles.time}>{workspace.updated}</span>
          <span className={a11y.hidden}>
            , {activityPresentation[workspace.status].label}
          </span>
          <ActionButton
            accessibilityLabel={`${props.action} ${workspace.name}`}
            icon={props.icon}
          >
            {props.action}
          </ActionButton>
        </li>
      ))}
    </ul>
  )
}
