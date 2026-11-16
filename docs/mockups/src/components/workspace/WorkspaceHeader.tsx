import type { Viewport } from '@mokly/mokly'
import { ChevronLeft, PanelRight } from 'lucide-react'
import { people } from '../../fixtures/members'
import type { ActivityStatus, Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { ShortcutTip } from '../common/ShortcutTip'
import { classes } from '../common/classes'
import { IconButton } from '../common/actions'
import { useCornerControls } from '../layout/sidebarPlace'
import { workspaceLabel } from '../workspaces/label'
import { CopyLinkButton, type CopyResult } from './CopyLinkButton'
import { HeaderState } from './HeaderState'
import { OwnerPicker } from './OwnerPicker'
import { RepositoryPicker } from './RepositoryPicker'
import { RunLinks, type RunSource } from './RunLinks'
import styles from './WorkspaceHeader.module.css'

/**
 * The name, number, repository, owner, and state of the open
 * workspace. The list groups workspaces by section, so the
 * header names the repository. The label of the number follows the name,
 * and copies the link of the workspace. On desktop its tooltip names the
 * key of Copy link. On a phone it leads the line under
 * the name, before the repository. The repository opens the menu that
 * moves the workspace to another repository. For an admin of the org,
 * the owner opens the menu that reassigns the workspace. On desktop the
 * header ends with the toggle that hides the right column and shows it
 * again. A run workspace also links to its automation and its pull request.
 * While the software of the cloud computer runs, the state opens a menu with
 * Restart, for every member of an org that is not suspended.
 */
export function WorkspaceHeader(props: {
  workspace: Workspace
  /** The name to show, such as Untitled before the title comes. */
  name: string
  status: ActivityStatus
  viewport: Viewport
  /** The menu of the owner is open. A phone shows it as a sheet. */
  ownerOpen?: boolean
  /** The menu of the state is open. A phone shows it as a sheet. */
  stateOpen?: boolean
  /** The workspace can change, so the state can open its menu. */
  canRestart: boolean
  /** The person signed in is an admin of the org, who can reassign. */
  canReassign: boolean
  /** The list that Back opens on a phone, such as that of a suspended org. */
  back?: string
  /** The result of the last press on the label, while the header shows it. */
  copy?: CopyResult
  /** The user hid the right column of the desktop with the toggle. */
  rightHidden?: boolean
  /** The automation of a run workspace and the pull request of its run. */
  run?: RunSource
  /**
   * The menu of the repository is open, or the change of the repository
   * runs. A phone shows the menu as a sheet.
   */
  repositoryControl?: 'open' | 'changing'
}) {
  const { workspace, name } = props
  const corner = useCornerControls()
  const repositoryOpen = props.repositoryControl === 'open'
  const repository = (
    <RepositoryPicker
      changing={props.repositoryControl === 'changing'}
      inline={props.viewport === 'mobile'}
      open={repositoryOpen}
      repository={workspace.repository}
    />
  )
  const owner = (
    <OwnerPicker
      compact={props.viewport === 'mobile'}
      open={props.ownerOpen}
      owner={people[workspace.owner]}
      readOnly={!props.canReassign}
    />
  )
  const label = workspaceLabel(workspace.number)
  const copyLink = (
    <ShortcutTip command="copy-link" label={`Copy link to ${label}`}>
      <CopyLinkButton
        inline={props.viewport === 'mobile'}
        label={label}
        result={props.copy}
      />
    </ShortcutTip>
  )
  const header =
    props.viewport === 'mobile' ? (
      <header className={styles.mobile}>
        <ScreenLink asChild to={props.back ?? paths.shell}>
          <IconButton icon={ChevronLeft} label="All workspaces" />
        </ScreenLink>
        <div className={styles.titles}>
          <h1 className={styles.title}>{name}</h1>
          <span className={styles.line}>
            {copyLink}
            {repository}
          </span>
        </div>
        {owner}
        <HeaderState
          canRestart={props.canRestart}
          open={props.stateOpen}
          phone
          status={props.status}
        />
      </header>
    ) : (
      <header className={classes(styles.bar, corner && styles.cornerBar)}>
        <h1 className={styles.title}>{name}</h1>
        {copyLink}
        <span
          className={classes(styles.metas, repositoryOpen && styles.metasOpen)}
        >
          {repository}
        </span>
        {owner}
        <HeaderState
          canRestart={props.canRestart}
          open={props.stateOpen}
          status={props.status}
        />
        <IconButton
          icon={PanelRight}
          label={
            props.rightHidden
              ? 'Show the right column'
              : 'Hide the right column'
          }
        />
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
