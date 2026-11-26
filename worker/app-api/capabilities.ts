import {
  workspaceCapabilitiesPath,
  type WorkspaceCapabilitiesResponse,
} from '../../src/shared/secrets'
import type { AppDependencies, AppEnv } from '../env'
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
import { requireFeatureResult, type FeatureResult } from '../features/result'
import { warnWorker } from '../warnings'

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
  let capabilities = await readWorkspaceCapabilities(env.DB, orgId, workspaceId)
  if (request.method === 'PATCH') {
    await requireActiveOrg(env.DB, orgId)
    const change = readCapabilitiesChange(context.body)
    if (change.preapprovedSecretIds !== undefined)
      await requireOrgSecrets(env.DB, orgId, change.preapprovedSecretIds)
    let result: FeatureResult<typeof capabilities> | undefined
    try {
      if (!env.WORKSPACES)
        throw new Error('The workspace object is unavailable.')
      result = await env.WORKSPACES.getByName(workspaceId).changeCapabilities({
        orgId,
        workspaceId,
        now: dependencies.now(),
        change,
        member: {
          id: context.user.id,
          githubLogin: context.user.githubLogin,
          displayName: context.user.displayName,
          avatarUrl: context.user.avatarUrl,
        },
      })
    } catch {
      warnWorker({ kind: 'capability_notes_unavailable' })
    }
    if (result) capabilities = requireFeatureResult(result)
    else {
      await updateWorkspaceCapabilities(env.DB, {
        orgId,
        workspaceId,
        userId,
        now: dependencies.now(),
        change,
      })
      capabilities = await readWorkspaceCapabilities(env.DB, orgId, workspaceId)
    }
    await requireOrgMember(env.DB, orgId, userId)
    await requireActiveOrg(env.DB, orgId)
  }
  return Response.json({
    capabilities,
  } satisfies WorkspaceCapabilitiesResponse)
}
