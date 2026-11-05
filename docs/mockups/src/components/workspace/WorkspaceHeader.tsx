import type { Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { ChevronLeft, FolderGit2, GitBranch } from 'lucide-react'
import { repositories } from '../../fixtures/repositories'
import type { ActivityStatus, Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { IconButton } from '../common/actions'
import { activityPresentation } from '../workspaces/status'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import styles from './WorkspaceHeader.module.css'

function State(props: { status: ActivityStatus }) {
  return (
    <span className={styles.state}>
      <StatusGlyph status={props.status} />
      {activityPresentation[props.status].label}
    </span>
  )
}

/**
 * The name, repository, branch, and state of the open workspace. The list
 * groups workspaces by section, so the header names the repository.
 */
export function WorkspaceHeader(props: {
  workspace: Workspace
  /** The name to show, such as the city name of a new workspace. */
  name: string
  status: ActivityStatus
  viewport: Viewport
}) {
  const { workspace, name } = props
  const repository = repositories[workspace.repository].name
  if (props.viewport === 'mobile') {
    return (
      <header className={styles.mobile}>
        <MockLink asChild to={paths.shell}>
          <IconButton icon={ChevronLeft} label="All workspaces" />
        </MockLink>
        <div className={styles.titles}>
          <h1 className={styles.title}>{name}</h1>
          <span className={styles.branch}>
            {repository} · {workspace.branch}
          </span>
        </div>
        <State status={props.status} />
      </header>
    )
  }
  return (
    <header className={styles.bar}>
      <h1 className={styles.title}>{name}</h1>
      <span className={styles.meta}>
        <FolderGit2 aria-hidden className={styles.icon} size={13} />
        <span className={styles.branch}>{repository}</span>
      </span>
      <span className={styles.meta}>
        <GitBranch aria-hidden className={styles.icon} size={13} />
        <span className={styles.branch}>{workspace.branch}</span>
      </span>
      <span className={styles.spacer} />
      <State status={props.status} />
    </header>
  )
}
