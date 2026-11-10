import type { Viewport } from '@mokly/mokly'
import { ChevronLeft, FolderGit2, PanelRight } from 'lucide-react'
import { people } from '../../fixtures/members'
import { repositories } from '../../fixtures/repositories'
import type { Workspace, WorkspaceStatus } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import { ImportFlag } from '../conductor-import/ImportedParts'
import { workspaceLabel } from '../workspaces/label'
import { activityPresentation } from '../workspaces/status'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import { CopyLinkButton, type CopyResult } from './CopyLinkButton'
import { OwnerPicker } from './OwnerPicker'
import styles from './WorkspaceHeader.module.css'

function State(props: { status: WorkspaceStatus }) {
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
 * and copies the link of the workspace. On a phone it leads the line under
 * the name, before the repository. A workspace from Conductor shows its
 * flag after the label. For an admin of the org,
 * the owner opens the menu that reassigns the workspace. On desktop the
 * header ends with the toggle that hides the right column and shows it
 * again.
 */
export function WorkspaceHeader(props: {
  workspace: Workspace
  /** The name to show, such as Untitled before the title comes. */
  name: string
  status: WorkspaceStatus
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
  const copyLink = (
    <CopyLinkButton
      inline={props.viewport === 'mobile'}
      label={workspaceLabel(workspace.number)}
      result={props.copy}
    />
  )
  const flag = workspace.from === 'conductor' ? <ImportFlag /> : null
  if (props.viewport === 'mobile') {
    return (
      <header className={styles.mobile}>
        <ScreenLink asChild to={props.back ?? paths.shell}>
          <IconButton icon={ChevronLeft} label="All workspaces" />
        </ScreenLink>
        <div className={styles.titles}>
          <h1 className={styles.title}>{name}</h1>
          <span className={styles.line}>
            {copyLink}
            {flag}
            <span className={styles.branch}>{repository}</span>
          </span>
        </div>
        {owner}
        <State status={props.status} />
      </header>
    )
  }
  return (
    <header className={styles.bar}>
      <h1 className={styles.title}>{name}</h1>
      {copyLink}
      {flag}
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
          props.rightHidden ? 'Show the right column' : 'Hide the right column'
        }
      />
    </header>
  )
}
