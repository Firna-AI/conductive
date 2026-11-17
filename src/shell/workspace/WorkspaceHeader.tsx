import type { Workspace } from '../../shared/generated/Workspace'
import { useEffect, type ReactNode } from 'react'
import { ChevronLeft, FolderGit2 } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import owner from '../../../docs/mockups/src/components/workspace/OwnerPicker.module.css'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceHeader.module.css'
import { personName } from '../../app/people'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import { nameLabel } from '../../shared/name-label'

import { useOrgModel } from '../context'
import { useMacBar } from '../mac/mac-app'
import { IconButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { WorkspaceNameField } from '../list/WorkspaceNameField'
import { PersonAvatar } from '../ui/Avatars'
import ui from '../ui/ui.module.css'
import { CopyLink } from './CopyLink'
import { HeaderState } from './HeaderState'
import type { WorkspaceContext } from './features'
import { RightColumnToggle } from './WorkspaceColumns'
import { RunLine } from './RunLine'
import { useRunAutomation } from './saved-view'
import { useHeaderMenu } from './useHeaderMenu'

/** The owner of the workspace, without the menu that reassigns it. */
function Owner(props: { workspace: Workspace; compact: boolean }) {
  const person = props.workspace.owner
  return (
    <span className={owner.plain} title={`Owner: ${personName(person)}`}>
      <PersonAvatar person={person} size={props.compact ? 24 : 18} />
      {props.compact ? null : (
        <span className={owner.name}>{personName(person)}</span>
      )}
      <span className={ui.hidden}>, owner of the workspace</span>
    </span>
  )
}

/**
 * The name, number, repository, owner, and state of the open
 * workspace. A workspace
 * with no name yet shows Untitled. The label of the number copies the link
 * of the workspace. On desktop it follows the name, and the repository
 * takes the room that the other parts leave. On a phone it leads
 * the line under the name. The list groups workspaces by section, so the
 * header names the repository. On desktop the header ends with the toggle
 * of the right column. A run workspace links to its automation below it.
 * While the open of the workspace resumes its sandbox, the state shows
 * Starting at once, before the Resume reply. While the software runs, the
 * state opens the menu with Restart. A right click on the bar, but not on
 * one of its controls, opens the workspace menu of the list, and its Rename
 * puts the field in place of the name.
 */
export function WorkspaceHeader(props: {
  context: WorkspaceContext
  /** The owner picker of Milestone 15c. Without it the owner shows read-only. */
  ownerControl?: ReactNode
}) {
  const { workspace, org } = props.context
  const model = useOrgModel(org.id)
  const repositories = valueOf(useStore(model.repositories))
  const go = useGo()
  const bar = useMacBar()
  const automation = useRunAutomation(props.context.savedView)
  const menu = useHeaderMenu(props.context)
  useEffect(() => model.watch('repositories'), [model])
  const repository =
    repositories?.find((item) => item.id === workspace.repositoryId)
      ?.fullName ?? workspace.repositoryId
  const name = nameLabel(workspace.name)
  const phone = props.context.viewport === 'phone'
  const state = props.context.resumingAtOpen ? 'starting' : workspace.state
  const ownerView = props.ownerControl ?? (
    <Owner compact={phone} workspace={workspace} />
  )
  const stateView = (
    <HeaderState context={props.context} key={workspace.id} state={state} />
  )
  const title = menu.rename ? (
    <WorkspaceNameField
      className={styles.titleField}
      name={workspace.name}
      page={false}
      rename={menu.rename}
    />
  ) : (
    <h1 className={styles.title}>{name}</h1>
  )
  const copyLink = (
    <CopyLink inline={phone} key={workspace.link} workspace={workspace} />
  )
  const header = phone ? (
    <header className={styles.mobile} onContextMenu={menu.onContextMenu}>
      <IconButton
        icon={ChevronLeft}
        label="All workspaces"
        onPress={() => go(routes.org(org.id))}
      />
      <div className={styles.titles}>
        {title}
        <span className={styles.line}>
          {copyLink}
          <span className={styles.branch}>{repository}</span>
        </span>
      </div>
      {ownerView}
      {stateView}
    </header>
  ) : (
    <header
      className={classes(styles.bar, bar)}
      onContextMenu={menu.onContextMenu}
    >
      {title}
      {copyLink}
      <span className={styles.metas}>
        <span className={styles.meta}>
          <FolderGit2 aria-hidden className={styles.icon} size={13} />
          <span className={styles.branch}>{repository}</span>
        </span>
      </span>
      {ownerView}
      {stateView}
      <RightColumnToggle />
    </header>
  )
  return (
    <>
      {header}
      {automation ? <RunLine orgId={org.id} automation={automation} /> : null}
      {menu.layer}
    </>
  )
}
