import { API_PATHS, orgPath } from '../../src/shared/api'
import {
  invitePath,
  invitesPath,
  memberPath,
  membersPath,
  workspaceOwnerPath,
} from '../../src/shared/members'
import {
  deleteOrgPath,
  leaveOrgPath,
  restoreOrgPath,
} from '../../src/shared/orgs'
import type { Workspace } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError, requiredString } from '../http'
import type { RequestContext } from '../security/gate'
import { deleteOrg } from './deletion'
import { cancelOrgInvite, inviteOrgMember } from './invites'
import type { OrgMaintenanceHooks } from './maintenance-contract'
import { changeMemberRole, listMembers, removeOrgMember } from './membership'
import { renameOrg, visibleOrgs } from './org-data'
import { reassignWorkspace } from './ownership'
import { requireOrgAdmin, requireOrgMember } from './permissions'
import { restoreOrg } from './restore'

export interface MembersHooks extends OrgMaintenanceHooks {
  readWorkspace(
    orgId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Workspace>
  /** Drain starts/builds and close access. Deleted maintenance owns disk retention until the Restore handoff. */
  suspendOrg(orgId: string, workspaceIds: readonly string[]): Promise<void>
  /** Idempotently remove all Durable Object state and external data for this workspace. */
  deleteWorkspaceState(orgId: string, workspaceId: string): Promise<void>
}

export async function membersRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  hooks: MembersHooks,
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  const { DB: db } = env
  const actorId = context.user.id
  const body = context.body
  if (path === API_PATHS.orgs && request.method === 'GET') {
    return Response.json({ orgs: await visibleOrgs(db, actorId) })
  }
  if (!context.org) return null
  const orgId = context.org.id
  if (path === orgPath(orgId)) {
    if (request.method === 'GET')
      return Response.json({
        org: await requireOrgMember(db, orgId, actorId, true),
      })
    if (request.method === 'PATCH') {
      await requireOrgAdmin(db, orgId, actorId)
      if (!(await renameOrg(db, orgId, actorId, requiredString(body?.name)))) {
        await requireOrgAdmin(db, orgId, actorId)
      }
      return Response.json({ org: await requireOrgMember(db, orgId, actorId) })
    }
  }
  if (path === deleteOrgPath(orgId) && request.method === 'POST') {
    return Response.json({
      org: await deleteOrg(
        env,
        orgId,
        actorId,
        requiredString(body?.name),
        dependencies,
        hooks,
      ),
    })
  }
  if (path === restoreOrgPath(orgId) && request.method === 'POST') {
    return Response.json({
      org: await restoreOrg(env, orgId, actorId, dependencies, hooks),
    })
  }
  if (path === leaveOrgPath(orgId) && request.method === 'POST') {
    await removeOrgMember(db, orgId, actorId, actorId, dependencies.now())
    return new Response(null, { status: 204 })
  }
  if (path === membersPath(orgId) && request.method === 'GET') {
    return Response.json(await listMembers(db, orgId, actorId))
  }
  if (path === invitesPath(orgId) && request.method === 'POST') {
    const invite = await inviteOrgMember(
      db,
      orgId,
      actorId,
      dependencies.randomToken(),
      requiredString(body?.githubLogin),
      dependencies.now(),
    )
    return Response.json({ invite }, { status: 201 })
  }
  const inviteId = childId(path, invitesPath(orgId))
  if (
    inviteId &&
    path === invitePath(orgId, inviteId) &&
    request.method === 'DELETE'
  ) {
    await cancelOrgInvite(db, orgId, actorId, inviteId)
    return new Response(null, { status: 204 })
  }
  const memberId = childId(path, membersPath(orgId))
  if (memberId && path === memberPath(orgId, memberId)) {
    if (request.method === 'PATCH') {
      if (body?.role !== 'admin' && body?.role !== 'member') {
        throw new HttpError(400, 'invalid_input', 'Choose admin or member.')
      }
      return Response.json({
        member: await changeMemberRole(db, orgId, actorId, memberId, body.role),
      })
    }
    if (request.method === 'DELETE') {
      await removeOrgMember(db, orgId, actorId, memberId, dependencies.now())
      return new Response(null, { status: 204 })
    }
  }
  const workspacePrefix = `${orgPath(orgId)}/workspaces/`
  if (
    path.startsWith(workspacePrefix) &&
    path.endsWith('/owner') &&
    request.method === 'PUT'
  ) {
    const id = decodedId(path.slice(workspacePrefix.length, -'/owner'.length))
    if (path !== workspaceOwnerPath(orgId, id)) return null
    return Response.json({
      workspace: await reassignWorkspace(
        db,
        orgId,
        actorId,
        id,
        requiredString(body?.userId),
        dependencies.now(),
        hooks,
      ),
    })
  }
  return null
}

function childId(path: string, parent: string) {
  const suffix = path.startsWith(`${parent}/`)
    ? path.slice(parent.length + 1)
    : ''
  return suffix && !suffix.includes('/') ? decodedId(suffix) : null
}

function decodedId(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new HttpError(404, 'not_found', 'The page is not available.')
  }
}
