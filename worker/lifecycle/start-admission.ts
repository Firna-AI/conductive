import type { AppDependencies, AppEnv } from '../env'
import { pinRetryCreation } from './retry-creation-data'
import { requireActiveStartUsers } from './start-access'
import { startDeadlineAt } from './start-provider-retry'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'
import { readWorkspace } from './workspace-data'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'

/** The coordinator holds its serial task until native admission is durable. */
export async function enqueueWorkspaceStart(
  env: AppEnv,
  dependencies: AppDependencies,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  job: WorkspaceStartJob,
): Promise<boolean> {
  const completed = await storage.creationResult()
  if (
    job.kind === 'create' &&
    completed &&
    (completed.ok || !job.replaceFailedCreation)
  )
    return false
  if (await storage.job()) return false
  await requireActiveStartUsers(env.DB, job)
  const epoch = await storage.epoch()
  const state = await endpoint.readLifecycle()
  if (state?.startStop === 'pending') return false
  if (
    job.replaceFailedCreation &&
    (!state || !['stopped', 'error'].includes(state.state))
  )
    return false
  if (
    job.replaceFailedCreation &&
    (await readWorkspace(env.DB, job.orgId, job.workspaceId)).archivedAt !==
      null
  )
    return false
  if (
    job.kind === 'resume' &&
    state?.state !== 'stopped' &&
    state?.state !== 'error'
  )
    return false
  if (job.kind === 'resume') await endpoint.finishDiskMaintenance()
  const prepared = job.replaceFailedCreation
    ? await pinRetryCreation(env.DB, job)
    : job
  if (
    !(await storage.begin(
      {
        ...prepared,
        deadlineAt: startDeadlineAt(job, dependencies.now()),
      },
      epoch,
    ))
  )
    return false
  await endpoint.beginLifecycleStart(job.kind)
  await storage.schedule()
  return true
}
