import type { OrgRole } from '../shared/api'
import type { Workspace } from '../shared/workspaces'

/** The signed-in person, with their role in the org of the workspace. */
export interface GitHubViewer {
  id: string
  role: OrgRole
}

/**
 * Decision 42: only the workspace owner and the admins of the org archive a
 * workspace. An archived workspace has nothing left to archive.
 */
export function canArchive(
  workspace: Pick<Workspace, 'owner' | 'state'>,
  viewer: GitHubViewer,
): boolean {
  if (workspace.state === 'archived') return false
  return viewer.role === 'admin' || workspace.owner.id === viewer.id
}
