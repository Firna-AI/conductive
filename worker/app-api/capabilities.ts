import {
  workspaceCapabilitiesPath,
  type WorkspaceCapabilitiesResponse,
} from '../../src/shared/secrets'
import type { AppDependencies, AppEnv } from '../env'
import { deviceCall } from '../devices/internal'
import { requireActiveOrg } from '../data/user-access'
import { requireOrgMember } from '../members/permissions'
import {
  readWorkspaceCapabilities,
  requireOrgSecrets,
} from '../secrets/capabilities-data'
import { readCapabilitiesChange } from '../secrets/capabilities-input'
import { updateWorkspaceCapabilities } from '../secrets/capabilities-writes'
import type { RequestContext } from '../security/gate'
import { workspaceChildId } from './workspace-path'
import { workspaceBinding } from './workspace-state'

export async function capabilitiesRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org || !['GET', 'PATCH'].includes(request.method)) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  const workspaceId = workspaceChildId(path, orgId)
  if (!workspaceId || path !== workspaceCapabilitiesPath(orgId, workspaceId))
    return null
  const userId = context.user.id
  await requireOrgMember(env.DB, orgId, userId)
  await readWorkspaceCapabilities(env.DB, orgId, workspaceId)
  if (request.method === 'PATCH') {
    await requireActiveOrg(env.DB, orgId)
    const change = readCapabilitiesChange(context.body)
    if (change.preapprovedSecretIds !== undefined)
      await requireOrgSecrets(env.DB, orgId, change.preapprovedSecretIds)
    await updateWorkspaceCapabilities(env.DB, {
      orgId,
      workspaceId,
      userId,
      now: dependencies.now(),
      change,
    })
    await requireOrgMember(env.DB, orgId, userId)
    await requireActiveOrg(env.DB, orgId)
    if (change.macAccess === false) {
      await deviceCall(env, workspaceId, {
        type: 'workspace.mac-access-changed',
      })
      await workspaceBinding(env)
        .getByName(workspaceId)
        .publishWorkspaceMetadata(orgId, workspaceId)
    }
  }
  return Response.json({
    capabilities: await readWorkspaceCapabilities(env.DB, orgId, workspaceId),
  } satisfies WorkspaceCapabilitiesResponse)
}
