import type { OrgRole } from '../../src/shared/api'
import type { MembersResponse } from '../../src/shared/members'
import { HttpError } from '../http'
import { guardedMembersWrite } from './guarded-write'
import { listInvites } from './invite-data'
import {
  orgMember,
  orgMembers,
  removeMembership,
  updateRole,
} from './member-data'
import { requireOrgAdmin, requireOrgMember } from './permissions'

export async function listMembers(
  db: D1Database,
  orgId: string,
  actorId: string,
): Promise<MembersResponse> {
  const org = await requireOrgMember(db, orgId, actorId)
  return {
    members: await orgMembers(db, orgId),
    invites: org.role === 'admin' ? await listInvites(db, orgId) : [],
  }
}

export async function changeMemberRole(
  db: D1Database,
  orgId: string,
  actorId: string,
  userId: string,
  role: OrgRole,
) {
  await guardedMembersWrite({
    checks: [
      () => requireOrgAdmin(db, orgId, actorId),
      () => requireMember(db, orgId, userId),
    ],
    write: () => updateRole(db, orgId, actorId, userId, role),
    refusal: lastAdminError,
  })
  return requireMember(db, orgId, userId)
}

export async function removeOrgMember(
  db: D1Database,
  orgId: string,
  actorId: string,
  userId: string,
  now: number,
) {
  const voluntary = actorId === userId
  await guardedMembersWrite({
    checks: [
      () =>
        voluntary
          ? requireOrgMember(db, orgId, actorId)
          : requireOrgAdmin(db, orgId, actorId),
      () => requireMember(db, orgId, userId),
    ],
    write: () => removeMembership(db, orgId, actorId, userId, voluntary, now),
    refusal: lastAdminError,
  })
}

export async function requireMember(
  db: D1Database,
  orgId: string,
  userId: string,
) {
  const member = await orgMember(db, orgId, userId)
  if (!member)
    throw new HttpError(404, 'member_not_found', 'The member is not available.')
  return member
}

export function lastAdminError() {
  return new HttpError(
    409,
    'last_admin',
    'Make another member an admin, or delete the org first.',
  )
}
