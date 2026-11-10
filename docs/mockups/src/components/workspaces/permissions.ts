import type { Membership, PersonKey } from '../../fixtures/members'

/** The owner and the org's admins can archive a workspace. */
export function mayArchiveWorkspace(
  viewer: Membership,
  owner: PersonKey,
): boolean {
  return viewer.role === 'admin' || viewer.person === owner
}
