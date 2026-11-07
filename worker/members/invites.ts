import type { OrgMember } from '../../src/shared/members'
import { HttpError } from '../http'
import { guardedMembersWrite } from './guarded-write'
import {
  deleteInvite,
  insertInvite,
  listPendingInvites,
  takeInvite,
} from './invite-data'
import { requireMember } from './membership'
import { requireOrgAdmin } from './permissions'

export async function inviteOrgMember(
  db: D1Database,
  orgId: string,
  actorId: string,
  id: string,
  email: string,
  now: number,
) {
  return guardedMembersWrite({
    checks: [() => requireOrgAdmin(db, orgId, actorId)],
    write: () => insertInvite(db, orgId, actorId, id, email.toLowerCase(), now),
    refusal: () =>
      new HttpError(
        403,
        'admin_required',
        'Ask an org admin to make this change.',
      ),
  })
}

/** The future shell calls this with the signed-in user ID from its request gate. */
export function pendingOrgInvites(db: D1Database, userId: string) {
  return listPendingInvites(db, userId)
}

export async function cancelOrgInvite(
  db: D1Database,
  orgId: string,
  actorId: string,
  inviteId: string,
) {
  await guardedMembersWrite({
    checks: [() => requireOrgAdmin(db, orgId, actorId)],
    write: () => deleteInvite(db, orgId, actorId, inviteId),
    refusal: inviteNotFound,
  })
}

export async function acceptOrgInvite(
  db: D1Database,
  userId: string,
  orgId: string,
  inviteId: string,
  now: number,
): Promise<OrgMember> {
  await guardedMembersWrite({
    checks: [],
    write: () => takeInvite(db, orgId, userId, inviteId, now),
    refusal: inviteNotFound,
  })
  return requireMember(db, orgId, userId)
}

function inviteNotFound() {
  return new HttpError(404, 'invite_not_found', 'The invite is not available.')
}
