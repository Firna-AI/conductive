import type { Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { ChevronLeft, GitBranch } from 'lucide-react'
import type { ActivityStatus, Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { IconButton } from '../common/actions'
import { StatusText } from '../common/StatusText'
import { activityPresentation } from '../workspaces/status'
import styles from './WorkspaceHeader.module.css'

/** The name, branch, and sandbox state of the open workspace. */
export function WorkspaceHeader(props: {
  workspace: Workspace
  status: ActivityStatus
  viewport: Viewport
}) {
  const { workspace } = props
  const presentation = activityPresentation[props.status]
  const state = (
    <StatusText
      busy={presentation.busy}
      icon={presentation.icon}
      label={presentation.label}
      tone={presentation.tone}
    />
  )
  if (props.viewport === 'mobile') {
    return (
      <header className={styles.mobile}>
        <MockLink asChild to={paths.shell}>
          <IconButton icon={ChevronLeft} label="All workspaces" />
        </MockLink>
        <div className={styles.titles}>
          <h1 className={styles.title}>{workspace.name}</h1>
          <span className={styles.branch}>{workspace.branch}</span>
        </div>
        {state}
      </header>
    )
  }
  return (
    <header className={styles.bar}>
      <h1 className={styles.title}>{workspace.name}</h1>
      <span className={styles.meta}>
        <GitBranch size={13} />
        <span className={styles.branch}>{workspace.branch}</span>
      </span>
      <span className={styles.spacer} />
      {state}
    </header>
  )
}
