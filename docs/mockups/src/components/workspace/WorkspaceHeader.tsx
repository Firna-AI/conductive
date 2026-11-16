import type { Viewport } from '@mokly/mokly'
import { FolderGit2 } from 'lucide-react'
import { defined } from '../../defined'
import { people } from '../../fixtures/members'
import { repositories } from '../../fixtures/repositories'
import type { ActivityStatus, Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { shortcutTip } from '../../entries/components/common/ShortcutTip.mockup'
import { iconButton } from '../../entries/components/common/actions.mockup'
import { workspaceLabel } from '../workspaces/label'
import { activityPresentation } from '../workspaces/status'
import { statusGlyph } from '../../entries/components/workspaces/StatusGlyph.mockup'
import { copyLinkButton } from '../../entries/components/workspace/CopyLinkButton.mockup'
import type { CopyResult } from './CopyLinkButton'
import { ownerPicker } from '../../entries/components/workspace/OwnerPicker.mockup'
import { runLinks } from '../../entries/components/workspace/RunLinks.mockup'
import type { RunSource } from './RunLinks'
import styles from './WorkspaceHeader.module.css'

function State(props: { status: ActivityStatus }) {
  return (
    <span className={styles.state}>
      <statusGlyph.Component status={props.status} />
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
    <ownerPicker.Component
      compact={props.viewport === 'mobile'}
      owner={people[workspace.owner]}
      readOnly={!props.canReassign}
      {...defined({ open: props.ownerOpen })}
    />
  )
  const label = workspaceLabel(workspace.number)
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
