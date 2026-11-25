import type { Workspace } from '../../shared/generated/Workspace'
import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import owner from '../../ui/components/workspace/OwnerPicker.module.css'
import { NameMenuButton } from '../../ui/components/workspace/NameMenuButton'
import styles from '../../ui/components/workspace/WorkspaceHeader.module.css'
import { personName } from '../../app/people'
import { routes } from '../../app/router'
import { nameLabel } from '../../shared/name-label'
import { useMacBar } from '../mac/mac-app'
import { IconButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { WorkspaceNameField } from '../list/WorkspaceNameField'
import { PersonAvatar } from '../ui/Avatars'
import ui from '../ui/ui.module.css'
import { CopyLink } from './CopyLink'
import { HeaderState } from './HeaderState'
import type { WorkspaceContext } from './features'
import { RepositoryControl } from './repository/RepositoryControl'
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
 * header names the repository. The repository opens the menu that moves
 * the workspace to another repository, as `RepositoryControl` says. On desktop the header ends with the toggle
 * of the right column. A run workspace links to its automation below it.
 * While a Resume of the visit runs for a stopped sandbox, or for one whose
 * later start failed, the state shows Starting at once, before its reply:
 * the Resume of the open, of the open of a tab, or of a press, as
 * `WorkspaceContext.resuming` says. While the software runs, the
 * state opens the menu with Restart. The name is a button with no caret. It
 * opens the workspace menu of the list below it, and Rename in that menu
 * puts the field in place of the name. Until the list of the org loads, the
 * name is plain text.
 */
export function WorkspaceHeader(props: {
  context: WorkspaceContext
  /** The owner picker of Milestone 15c. Without it the owner shows read-only. */
  ownerControl?: ReactNode
}) {
  const { workspace, org } = props.context
  const go = useGo()
  const bar = useMacBar()
  const automation = useRunAutomation(props.context.savedView)
  const menu = useHeaderMenu(props.context)
  const repository = (
    <RepositoryControl context={props.context} key={workspace.id} />
  )
  const name = nameLabel(workspace.name)
  const phone = props.context.viewport === 'phone'
  const state = props.context.resuming ? 'starting' : workspace.state
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
  ) : menu.toggle ? (
    <NameMenuButton
      buttonRef={menu.buttonRef}
      name={name}
      onPointerDown={menu.pressStart}
      onPress={menu.toggle}
      open={menu.open}
    />
  ) : (
    <h1 className={styles.title}>{name}</h1>
  )
  const copyLink = (
    <CopyLink inline={phone} key={workspace.link} workspace={workspace} />
  )
  const header = phone ? (
    <header className={styles.mobile}>
      <IconButton
        icon={ChevronLeft}
        label="All workspaces"
        onPress={() => go(routes.org(org.id))}
      />
      <div className={styles.titles}>
        {title}
        <span className={styles.line}>
          {copyLink}
          {repository}
        </span>
      </div>
      {ownerView}
      {stateView}
    </header>
  ) : (
    <header className={classes(styles.bar, bar)}>
      {title}
      {copyLink}
      <span className={styles.metas}>{repository}</span>
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
