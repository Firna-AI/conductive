import type { OrgMember } from '../../src/shared/members'
import { HttpError } from '../http'
import { deleteInvite, insertInvite, takeInvite } from './invite-data'
import { requireMember } from './membership'
import { requireOrgAdmin } from './permissions'

export async function inviteOrgMember(
  db: D1Database,
  orgId: string,
  actorId: string,
  id: string,
  githubLogin: string,
  now: number,
) {
  await requireOrgAdmin(db, orgId, actorId)
  const invite = await insertInvite(db, orgId, actorId, id, githubLogin, now)
  if (!invite)
    throw new HttpError(
      403,
      'admin_required',
      'Ask an org admin to make this change.',
    )
  return invite
}

export async function cancelOrgInvite(
  db: D1Database,
  orgId: string,
  actorId: string,
  inviteId: string,
) {
  await requireOrgAdmin(db, orgId, actorId)
  if (!(await deleteInvite(db, orgId, actorId, inviteId)))
    throw inviteNotFound()
}

export async function acceptOrgInvite(
  db: D1Database,
  userId: string,
  orgId: string,
  inviteId: string,
  now: number,
): Promise<OrgMember> {
  if (!(await takeInvite(db, orgId, userId, inviteId, now)))
    throw inviteNotFound()
  return requireMember(db, orgId, userId)
}

function inviteNotFound() {
  return new HttpError(404, 'invite_not_found', 'The invite is not available.')
}
