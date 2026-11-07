import type { MessageSender } from '../../src/shared/messages'
import { HttpError } from '../http'
import { guardedMembersWrite } from './guarded-write'
import { requireMember } from './membership'
import { updateWorkspaceOwner } from './ownership-data'
import { requireOrgAdmin, requireOrgMember } from './permissions'
import type { MembersHooks } from './route'

/** The workspace lifecycle stores this member's ID in owner_user_id at creation. */
export async function workspaceCreator(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<MessageSender> {
  await requireOrgMember(db, orgId, userId)
  const { user } = await requireMember(db, orgId, userId)
  return {
    id: user.id,
    githubLogin: user.githubLogin,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

export async function reassignWorkspace(
  db: D1Database,
  orgId: string,
  actorId: string,
  workspaceId: string,
  userId: string,
  now: number,
  hooks: Pick<MembersHooks, 'readWorkspace'>,
) {
  await guardedMembersWrite({
    checks: [
      () => requireOrgAdmin(db, orgId, actorId),
      () => requireMember(db, orgId, userId),
    ],
    write: () =>
      updateWorkspaceOwner(db, orgId, actorId, workspaceId, userId, now),
    refusal: () =>
      new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      ),
  })
  return hooks.readWorkspace(orgId, workspaceId, actorId)
}
