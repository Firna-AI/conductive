import { useEffect, type ReactNode } from 'react'
import { ChevronLeft, FolderGit2, GitBranch } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { StatusGlyph } from '../../../docs/mockups/src/components/workspaces/StatusGlyph'
import { activityPresentation } from '../../../docs/mockups/src/components/workspaces/status'
import owner from '../../../docs/mockups/src/components/workspace/OwnerPicker.module.css'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceHeader.module.css'
import { personName } from '../../app/people'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import { nameLabel } from '../../shared/name-label'
import type { Workspace } from '../../shared/workspaces'
import { useOrgModel } from '../context'
import { useMacBar } from '../mac/mac-app'
import { IconButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { PersonAvatar } from '../ui/Avatars'
import ui from '../ui/ui.module.css'
import { CopyLink } from './CopyLink'
import type { WorkspaceContext } from './features'
import { RightColumnToggle } from './WorkspaceColumns'

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

function State(props: { workspace: Workspace }) {
  return (
    <span className={styles.state}>
      <StatusGlyph status={props.workspace.state} />
      {activityPresentation[props.workspace.state].label}
    </span>
  )
}

/**
 * The name, number, repository, branch, owner, and state of the open
 * workspace. A workspace
 * with no name yet shows Untitled. The label of the number copies the link
 * of the workspace. On desktop it follows the name, and the repository and
 * the branch share the room that the other parts leave. On a phone it leads
 * the line under the name. The list groups workspaces by section, so the
 * header names the repository. On desktop the header ends with the toggle
 * of the right column.
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
  useEffect(() => model.watch('repositories'), [model])
  const repository =
    repositories?.find((item) => item.id === workspace.repositoryId)
      ?.fullName ?? workspace.repositoryId
  const name = nameLabel(workspace.name)
  const phone = props.context.viewport === 'phone'
  const ownerView = props.ownerControl ?? (
    <Owner compact={phone} workspace={workspace} />
  )
  const copyLink = (
    <CopyLink inline={phone} key={workspace.link} workspace={workspace} />
  )
  if (phone) {
    return (
      <header className={styles.mobile}>
        <IconButton
          icon={ChevronLeft}
          label="All workspaces"
          onPress={() => go(routes.org(org.id))}
        />
        <div className={styles.titles}>
          <h1 className={styles.title}>{name}</h1>
          <span className={styles.line}>
            {copyLink}
            <span className={styles.branch}>
              {repository} · {workspace.branch}
            </span>
          </span>
        </div>
        {ownerView}
        <State workspace={workspace} />
      </header>
    )
  }
  return (
    <header className={classes(styles.bar, bar)}>
      <h1 className={styles.title}>{name}</h1>
      {copyLink}
      <span className={styles.metas}>
        <span className={styles.meta}>
          <FolderGit2 aria-hidden className={styles.icon} size={13} />
          <span className={styles.branch}>{repository}</span>
        </span>
        <span className={styles.meta}>
          <GitBranch aria-hidden className={styles.icon} size={13} />
          <span className={styles.branch}>{workspace.branch}</span>
        </span>
      </span>
      {ownerView}
      <State workspace={workspace} />
      <RightColumnToggle />
    </header>
  )
}
