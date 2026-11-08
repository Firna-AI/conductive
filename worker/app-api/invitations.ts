import {
  PENDING_ORG_INVITES_PATH,
  acceptOrgInvitePath,
  type AcceptOrgInviteResponse,
  type PendingOrgInvitesResponse,
} from '../../src/shared/members'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { acceptOrgInvite, pendingOrgInvites } from '../members/invites'
import { requireOrgMember } from '../members/permissions'
import type { RequestContext } from '../security/gate'

export async function invitationsRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  if (path === PENDING_ORG_INVITES_PATH && request.method === 'GET')
    return Response.json({
      invites: await pendingOrgInvites(env.DB, context.user.id),
    } satisfies PendingOrgInvitesResponse)
  if (
    request.method !== 'POST' ||
    !path.startsWith(`${PENDING_ORG_INVITES_PATH}/`)
  )
    return null
  const invitation = (await pendingOrgInvites(env.DB, context.user.id)).find(
    (invite) => path === acceptOrgInvitePath(invite.id),
  )
  if (!invitation) {
    throw new HttpError(404, 'invite_not_found', 'The invite is not available.')
  }
  await acceptOrgInvite(
    env.DB,
    context.user.id,
    invitation.orgId,
    invitation.id,
    dependencies.now(),
  )
  return Response.json({
    org: await requireOrgMember(env.DB, invitation.orgId, context.user.id),
  } satisfies AcceptOrgInviteResponse)
}
