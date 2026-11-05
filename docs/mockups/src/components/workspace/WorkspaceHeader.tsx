import type { Viewport } from '@mokly/mokly'
import { ChevronLeft, FolderGit2, GitBranch } from 'lucide-react'
import { people } from '../../fixtures/members'
import { repositories } from '../../fixtures/repositories'
import type { ActivityStatus, Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import { activityPresentation } from '../workspaces/status'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import { OwnerPicker } from './OwnerPicker'
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
 * The name, repository, branch, owner, and state of the open workspace.
 * The list groups workspaces by section, so the header names the
 * repository. The owner opens the menu that reassigns the workspace.
 */
export function WorkspaceHeader(props: {
  workspace: Workspace
  /** The name to show, such as the city name of a new workspace. */
  name: string
  status: ActivityStatus
  viewport: Viewport
  /** The menu of the owner is open. A phone shows it as a sheet. */
  ownerOpen?: boolean
}) {
  const { workspace, name } = props
  const repository = repositories[workspace.repository].name
  const owner = people[workspace.owner]
  if (props.viewport === 'mobile') {
    return (
      <header className={styles.mobile}>
        <ScreenLink asChild to={paths.shell}>
          <IconButton icon={ChevronLeft} label="All workspaces" />
        </ScreenLink>
        <div className={styles.titles}>
          <h1 className={styles.title}>{name}</h1>
          <span className={styles.branch}>
            {repository} · {workspace.branch}
          </span>
        </div>
        <OwnerPicker compact open={props.ownerOpen} owner={owner} />
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
      <OwnerPicker open={props.ownerOpen} owner={owner} />
      <State status={props.status} />
    </header>
  )
}
