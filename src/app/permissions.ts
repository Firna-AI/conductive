import type { OrgRole, User } from '../shared/api'
import type { OrgSummary } from '../shared/orgs'
import type { Workspace } from '../shared/workspaces'

/**
 * Whether the operator suspended an org: its summary says so, or the API
 * refused one of its requests with `org_suspended` while the summary was
 * old. `refused` holds the IDs of the orgs of such refusals.
 */
export function isSuspended(
  org: Pick<OrgSummary, 'id' | 'suspension'>,
  refused: ReadonlySet<string>,
): boolean {
  return org.suspension !== undefined || refused.has(org.id)
}

/**
 * What the person signed in may do in an org: their role, and whether the
 * org is suspended. Nothing in a suspended org can change, except a leave.
 */
export interface OrgAccess {
  role: OrgRole
  suspended: boolean
}

/**
 * Only an admin changes the shared settings of an org: its name, its
 * repositories, its scripts, and its env vars. Nothing in a suspended org
 * changes, also for an admin.
 */
export function mayChangeSettings(access: OrgAccess): boolean {
  return access.role === 'admin' && !access.suspended
}

/**
 * The settings tell a member who is not an admin that only an admin can
 * change them. A suspended org adds nothing, because its notice says why.
 */
export function showsAdminOnly(access: OrgAccess): boolean {
  return access.role !== 'admin' && !access.suspended
}

/**
 * Only the owner of a workspace and the admins of its org archive it
 * (decision 42). An archived workspace has nothing more to archive, and a
 * suspended org archives nothing.
 */
export function mayArchive(
  access: OrgAccess,
  workspace: Workspace,
  viewer: Pick<User, 'id'>,
): boolean {
  if (workspace.state === 'archived' || access.suspended) return false
  return access.role === 'admin' || workspace.owner.id === viewer.id
}
