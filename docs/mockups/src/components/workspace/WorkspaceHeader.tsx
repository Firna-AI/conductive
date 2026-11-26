import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { defined } from '../../defined'
import { people } from '../../fixtures/members'
import type { Workspace } from '../../fixtures/workspaces'
import type { ActivityStatus } from '../../../../../src/ui/components/workspaces/activityStatus'
import { paths } from '../../paths'
import { menu as menuPart } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { ScreenLink } from '../common/ScreenLink'
import { shortcutTip } from '../../entries/components/common/ShortcutTip.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { iconButton } from '../../entries/components/common/actions.mockup'
import { useCornerControls } from '../layout/sidebarPlace'
import { workspaceLabel } from '../../../../../src/ui/components/workspaces/label'
import rowMenu from '../../../../../src/ui/components/workspaces/RowMenu.module.css'
import { copyLinkButton } from '../../entries/components/workspace/CopyLinkButton.mockup'
import type { CopyResult } from '../../../../../src/ui/components/workspace/CopyLinkButton'
import { HeaderState } from './HeaderState'
import { NameMenuButton } from '../../../../../src/ui/components/workspace/NameMenuButton'
import { ownerPicker } from '../../entries/components/workspace/OwnerPicker.mockup'
import { RepositoryPicker } from './RepositoryPicker'
import { runLinks } from '../../entries/components/workspace/RunLinks.mockup'
import type { RunSource } from './RunLinks'
import styles from '../../../../../src/ui/components/workspace/WorkspaceHeader.module.css'

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
 * Restart, for every member of an org that is not suspended. The name is a
 * button with no caret. It opens the workspace menu of the list below it,
 * and Rename in that menu puts the field in place of the name.
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
  /**
   * The workspace menu that the name opened, below the name on desktop. A
   * phone shows it as a sheet.
   */
  menu?: readonly MenuEntryData[]
  /** Rename of the workspace menu put the field in place of the name. */
  renaming?: boolean
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
    <ownerPicker.Component
      compact={props.viewport === 'mobile'}
      owner={people[workspace.owner]}
      readOnly={!props.canReassign}
      {...defined({ open: props.ownerOpen })}
    />
  )
  const label = workspaceLabel(workspace.number)
  // A view runs no script, so a span stands for the field, which opens
  // focused, with the name selected.
  const title = props.renaming ? (
    <span
      aria-label="Workspace name"
      className={classes(rowMenu.field, styles.titleField)}
      role="textbox"
    >
      <span className={rowMenu.selection}>{name}</span>
    </span>
  ) : props.menu ? (
    <span className={styles.nameAnchor}>
      <NameMenuButton name={name} open />
      <span className={styles.nameMenu}>
        <menuPart.Component
          entries={props.menu}
          label={name}
          moklyInstance="name-menu"
          placement="point"
        />
      </span>
    </span>
  ) : (
    <NameMenuButton name={name} />
  )
  const copyLink = (
    <shortcutTip.Component
      command="copy-link"
      label={`Copy link to ${label}`}
      moklyInstance="copy-link-tip"
    >
      <copyLinkButton.Component
        inline={props.viewport === 'mobile'}
        label={label}
        {...defined({ result: props.copy })}
      />
    </shortcutTip.Component>
  )
  const header =
    props.viewport === 'mobile' ? (
      <header className={styles.mobile}>
        <ScreenLink asChild to={props.back ?? paths.shell}>
          <iconButton.Component
            icon="chevron-left"
            label="All workspaces"
            moklyInstance="all-workspaces"
          />
        </ScreenLink>
        <div className={styles.titles}>
          {title}
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
        {title}
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
        <iconButton.Component
          icon="panel-right"
          moklyInstance="toggle-right-column"
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
      <runLinks.Component run={props.run} />
    </>
  )
}
