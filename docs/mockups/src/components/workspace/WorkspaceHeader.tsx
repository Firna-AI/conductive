import type { Viewport } from '@mokly/mokly'
import { ChevronLeft, FolderGit2, PanelRight } from 'lucide-react'
import { people } from '../../fixtures/members'
import { repositories } from '../../fixtures/repositories'
import type { ActivityStatus, Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { ShortcutTip } from '../common/ShortcutTip'
import { IconButton } from '../common/actions'
import { workspaceLabel } from '../workspaces/label'
import { activityPresentation } from '../workspaces/status'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import { CopyLinkButton, type CopyResult } from './CopyLinkButton'
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
 * The name, number, repository, owner, and state of the open
 * workspace. The list groups workspaces by section, so the
 * header names the repository. The label of the number follows the name,
 * and copies the link of the workspace. On desktop its tooltip names the
 * key of Copy link. On a phone it leads the line under
 * the name, before the repository. For an admin of the org,
 * the owner opens the menu that reassigns the workspace. On desktop the
 * header ends with the toggle that hides the right column and shows it
 * again. A run workspace also links to its routine and its pull request.
 */
export function WorkspaceHeader(props: {
  workspace: Workspace
  /** The name to show, such as Untitled before the title comes. */
  name: string
  status: ActivityStatus
  viewport: Viewport
  /** The menu of the owner is open. A phone shows it as a sheet. */
  ownerOpen?: boolean
  /** The person signed in is an admin of the org, who can reassign. */
  canReassign: boolean
  /** The list that Back opens on a phone, such as that of a suspended org. */
  back?: string
  /** The result of the last press on the label, while the header shows it. */
  copy?: CopyResult
  /** The user hid the right column of the desktop with the toggle. */
  rightHidden?: boolean
  /** The routine of a run workspace and the pull request of its run. */
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
            <span className={styles.branch}>{repository}</span>
          </span>
        </div>
        {owner}
        <State status={props.status} />
      </header>
    ) : (
      <header className={styles.bar}>
        <h1 className={styles.title}>{name}</h1>
        {copyLink}
        <span className={styles.metas}>
          <span className={styles.meta}>
            <FolderGit2 aria-hidden className={styles.icon} size={13} />
            <span className={styles.branch}>{repository}</span>
          </span>
        </span>
        {owner}
        <State status={props.status} />
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
