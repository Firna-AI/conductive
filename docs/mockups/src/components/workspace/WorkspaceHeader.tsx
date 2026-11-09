import type { Viewport } from '@mokly/mokly'
import { Archive, ChevronLeft, FolderGit2, GitBranch } from 'lucide-react'
import { people } from '../../fixtures/members'
import { repositories } from '../../fixtures/repositories'
import type { ActivityStatus, Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import { activityPresentation } from '../workspaces/status'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import { OwnerPicker } from './OwnerPicker'
import { RunLinks, type RunSource } from './RunLinks'
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
 * The name, repository, branch, owner, and state of the open workspace,
 * and Archive. The list groups workspaces by section, so the header names
 * the repository. For an admin of the org, the owner opens the menu that
 * reassigns the workspace. The header of a run workspace also links to its
 * routine, and to the pull request that started the run.
 */
export function WorkspaceHeader(props: {
  workspace: Workspace
  /** The name to show, such as the city name of a new workspace. */
  name: string
  status: ActivityStatus
  viewport: Viewport
  /** The menu of the owner is open. A phone shows it as a sheet. */
  ownerOpen?: boolean
  /** The person signed in is an admin of the org, who can reassign. */
  canReassign: boolean
  /** The workspace can be archived: it is not archived yet. */
  archivable: boolean
  /** The list that Back opens on a phone, such as that of a suspended org. */
  back?: string
  /** The routine of a run workspace, and the pull request of its run. */
  run?: RunSource
}) {
  const { workspace, name } = props
  const repository = repositories[workspace.repository].name
  const owner = (
    <OwnerPicker
      compact={props.viewport === 'mobile'}
      open={props.ownerOpen}
      owner={people[workspace.owner]}
      readOnly={!props.canReassign}
    />
  )
  const archive = props.archivable ? (
    <ScreenLink asChild to={paths.archive}>
      <IconButton icon={Archive} label="Archive workspace" />
    </ScreenLink>
  ) : null
  const header =
    props.viewport === 'mobile' ? (
      <header className={styles.mobile}>
        <ScreenLink asChild to={props.back ?? paths.shell}>
          <IconButton icon={ChevronLeft} label="All workspaces" />
        </ScreenLink>
        <div className={styles.titles}>
          <h1 className={styles.title}>{name}</h1>
          <span className={styles.branch}>
            {repository} · {workspace.branch}
          </span>
        </div>
        {owner}
        <State status={props.status} />
        {archive}
      </header>
    ) : (
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
        {owner}
        <State status={props.status} />
        {archive}
      </header>
    )
  if (!props.run) return header
  return (
    <>
      {header}
      <RunLinks run={props.run} />
    </>
  )
}
