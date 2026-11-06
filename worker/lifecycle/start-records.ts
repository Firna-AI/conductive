import type { AppEnv, AppDependencies } from '../env'
import { HttpError } from '../http'
import { requireOrgMember } from './access'
import { insertWorkspace, workspaceExists } from './workspace-data'
import { leasedImage } from './image-leases'
import { ensureWorkspaceToken } from './tokens'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import type { WorkspaceStartJob } from './start-types'

export async function prepareWorkspaceRecords(
  env: AppEnv,
  dependencies: AppDependencies,
  endpoint: WorkspaceLifecycleEndpoint,
  job: WorkspaceStartJob,
): Promise<string> {
  const creation = job.creation
  if (!creation || job.kind !== 'create')
    throw new HttpError(
      409,
      'workspace_start_failed',
      'The cloud computer could not start. Try again.',
    )
  await requireOrgMember(env.DB, job.orgId, creation.user.id)
  await requireOrgMember(env.DB, job.orgId, creation.sender.id)
  if (!(await workspaceExists(env.DB, job.orgId, job.workspaceId))) {
    await insertWorkspace(env.DB, {
      id: job.workspaceId,
      orgId: job.orgId,
      repositoryId: creation.repositoryId,
      sectionId: creation.sectionId,
      user: creation.user,
      senderUserId: creation.sender.id,
      city: creation.city,
      branch: creation.branch,
      sessionId: creation.sessionId,
      turnId: job.turnId,
      message: creation.request,
      now: creation.createdAt,
    })
  }
  const imageName = await leasedImage(env.DB, job.orgId, job.workspaceId)
  await ensureWorkspaceToken(
    env,
    job.workspaceId,
    dependencies.randomToken,
    dependencies.now(),
  )
  await endpoint.initializeLifecycle({
    workspaceId: job.workspaceId,
    orgId: job.orgId,
    firstMessage: creation.request,
    firstTurn: {
      turnId: job.turnId,
      sessionId: creation.sessionId,
      senderUserId: creation.sender.id,
    },
  })
  await endpoint.beginLifecycleStart('create')
  return imageName
}
