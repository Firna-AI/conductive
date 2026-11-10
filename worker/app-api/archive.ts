import {
  workspacePaths,
  type ArchiveCheckResponse,
} from '../../src/shared/workspaces'
import { workspaceBinding } from './workspace-state'
import { workspaceChildId } from './workspace-path'
import type { RequestContext } from '../security/gate'
import type { AppDependencies, AppEnv } from '../env'
import { orgProviderForAccount } from '../sandbox/client'
import { repositoryLocation } from '../lifecycle/repository-locations'
import { workspaceRepositoryLocations } from '../lifecycle/repository-location-data'
import {
  localWorkCommand,
  localWorkResult,
  localWorkUnavailable,
} from '../lifecycle/local-work'
import { requireFeatureResult } from '../features/result'
import { requireOrgMember } from '../lifecycle/access'
import { readWorkspace } from '../lifecycle/workspace-data'

export async function readArchiveCheck(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  id: string,
  userId: string,
): Promise<ArchiveCheckResponse> {
  await requireOrgMember(env.DB, orgId, userId)
  const row = await readWorkspace(env.DB, orgId, id)
  if (!row.sandboxId) return { uncommittedFiles: [], unpushedCommits: 0 }
  const directory = repositoryLocation(
    await workspaceRepositoryLocations(env.DB, id),
    row.repositoryId,
  )
  const provider = await orgProviderForAccount(
    env,
    userId,
    orgId,
    dependencies.fetch,
    row.providerAccount,
  )
  const result = await provider.runCommand(
    row.sandboxId,
    localWorkCommand(directory),
  )
  if (result.exitCode !== 0 || result.timedOut) throw localWorkUnavailable()
  await requireOrgMember(env.DB, orgId, userId)
  return localWorkResult(result.stdout)
}

export async function archiveRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  const id = workspaceChildId(path, orgId)
  if (!id) return null
  const check =
    path === workspacePaths.archiveCheck(orgId, id) && request.method === 'GET'
  const archive =
    path === workspacePaths.archive(orgId, id) && request.method === 'POST'
  if (!check && !archive) return null
  const object = workspaceBinding(env).getByName(id)
  return Response.json(
    check
      ? requireFeatureResult(
          await object.checkWorkspaceArchive(orgId, id, context.user.id),
        )
      : requireFeatureResult(
          await object.archiveWorkspace(
            orgId,
            id,
            context.user.id,
            context.body?.discardUnpushedWork === true,
            env.APP_ORIGIN,
          ),
        ),
  )
}
