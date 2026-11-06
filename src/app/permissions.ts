import type { Org, User } from '../shared/api'
import type { Workspace } from '../shared/workspaces'

/**
 * Only the owner of a workspace and the admins of its org archive it
 * (decision 42). An archived workspace has nothing more to archive.
 */
export function mayArchive(
  org: Pick<Org, 'role'>,
  workspace: Workspace,
  viewer: Pick<User, 'id'>,
): boolean {
  if (workspace.state === 'archived') return false
  return org.role === 'admin' || workspace.owner.id === viewer.id
}
