import { useEffect, type ReactNode } from 'react'
import { Archive, ChevronLeft, FolderGit2, GitBranch } from 'lucide-react'
import { StatusGlyph } from '../../../docs/mockups/src/components/workspaces/StatusGlyph'
import { activityPresentation } from '../../../docs/mockups/src/components/workspaces/status'
import owner from '../../../docs/mockups/src/components/workspace/OwnerPicker.module.css'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceHeader.module.css'
import { personName } from '../../app/people'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import type { Workspace } from '../../shared/workspaces'
import { useOrgModel } from '../context'
import { IconButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { PersonAvatar } from '../ui/Avatars'
import ui from '../ui/ui.module.css'
import type { WorkspaceContext } from './features'

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
 * The name, repository, branch, owner, and state of the open workspace,
 * and Archive for its owner and the org's admins (decision 42). The list
 * groups workspaces by section, so the header names the repository.
 */
export function WorkspaceHeader(props: {
  context: WorkspaceContext
  /** The owner picker of Milestone 15c. Without it the owner shows read-only. */
  ownerControl?: ReactNode
}) {
  const { workspace, org, archive } = props.context
  const model = useOrgModel(org.id)
  const repositories = valueOf(useStore(model.repositories))
  const go = useGo()
  useEffect(() => model.ensure('repositories'), [model])
  const repository =
    repositories?.find((item) => item.id === workspace.repositoryId)
      ?.fullName ?? workspace.repositoryId
  const phone = props.context.viewport === 'phone'
  const ownerView = props.ownerControl ?? (
    <Owner compact={phone} workspace={workspace} />
  )
  const archiveButton = archive ? (
    <IconButton icon={Archive} label="Archive workspace" onPress={archive} />
  ) : null
  if (phone) {
    return (
      <header className={styles.mobile}>
        <IconButton
          icon={ChevronLeft}
          label="All workspaces"
          onPress={() => go(routes.org(org.id))}
        />
        <div className={styles.titles}>
          <h1 className={styles.title}>{workspace.name}</h1>
          <span className={styles.branch}>
            {repository} · {workspace.branch}
          </span>
        </div>
        {ownerView}
        <State workspace={workspace} />
        {archiveButton}
      </header>
    )
  }
  return (
    <header className={styles.bar}>
      <h1 className={styles.title}>{workspace.name}</h1>
      <span className={styles.meta}>
        <FolderGit2 aria-hidden className={styles.icon} size={13} />
        <span className={styles.branch}>{repository}</span>
      </span>
      <span className={styles.meta}>
        <GitBranch aria-hidden className={styles.icon} size={13} />
        <span className={styles.branch}>{workspace.branch}</span>
      </span>
      <span className={styles.spacer} />
      {ownerView}
      <State workspace={workspace} />
      {archiveButton}
    </header>
  )
}
