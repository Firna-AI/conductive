import type { AppEnv, AppDependencies } from '../env'
import { HttpError } from '../http'
import { requireOrgMember } from './access'
import { insertWorkspace, workspaceExists } from './workspace-data'
import { leasedCreationImage } from './image-leases'
import { ensureWorkspaceToken } from './tokens'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'
import { creationAdmissionResponse } from './creation-admission-response'
import { workspaceRepositoryLocations } from './repository-location-data'
import type { StartCall } from './start-guard'

export async function advanceStartRecords(
  env: AppEnv,
  dependencies: AppDependencies,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  job: Extract<WorkspaceStartJob, { phase: 'records' }>,
  call: StartCall,
) {
  const imageName = await prepareWorkspaceRecords(
    env,
    dependencies,
    endpoint,
    job,
    call,
  )
  if (imageName === null) return undefined
  const admission = await creationAdmissionResponse(
    env,
    endpoint,
    job,
    undefined,
    call,
  )
  await storage.update({
    ...job,
    phase: 'machine',
    providerRetry: null,
    imageName,
    admission,
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  return storage.admission()
}

async function prepareWorkspaceRecords(
  env: AppEnv,
  dependencies: AppDependencies,
  endpoint: WorkspaceLifecycleEndpoint,
  job: WorkspaceStartJob,
  call: StartCall,
): Promise<string | null> {
  const creation = job.creation
  if (!creation || job.kind !== 'create')
    throw new HttpError(
      409,
      'workspace_start_failed',
      'The cloud computer could not start. Try again.',
    )
  const { image, locations } = await call(async () => {
    await requireOrgMember(env.DB, job.orgId, creation.user.id)
    await requireOrgMember(env.DB, job.orgId, creation.sender.id)
    const image = await leasedCreationImage(
      env.DB,
      job.orgId,
      job.workspaceId,
      creation.repositoryId,
    )
    if (!(await workspaceExists(env.DB, job.orgId, job.workspaceId))) {
      await insertWorkspace(env.DB, {
        id: job.workspaceId,
        orgId: job.orgId,
        providerAccount: image.providerAccount,
        repositoryId: creation.repositoryId,
        sectionId: creation.sectionId,
        user: creation.user,
        senderUserId: creation.sender.id,
        city: creation.city,
        name: creation.name,
        branch: creation.branch,
        baseBranch: job.baseBranch,
        sessionId: creation.sessionId,
        turnId: job.turnId,
        message: creation.request,
        now: creation.createdAt,
        repositoryLocations: job.repositoryLocations,
      })
    }
    const locations =
      job.repositoryLocations ??
      (await workspaceRepositoryLocations(env.DB, job.workspaceId))
    return { image, locations }
  })
  job.defaultBranch = image.defaultBranch
  job.providerAccount = image.providerAccount
  job.repositoryLocations = locations
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
  return image.imageName
}
