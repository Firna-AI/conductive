import type { AppDependencies, AppEnv } from '../env'
import { pinRetryCreation } from './retry-creation-data'
import { requireActiveStartUsers } from './start-access'
import { startDeadlineAt } from './start-provider-retry'
import type {
  StartJobStorage,
  WorkspaceStartIntent,
  WorkspaceStartJob,
} from './start-types'
import { readWorkspace } from './workspace-data'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'

/** Admission commits in the caller's queue turn. */
export async function enqueueWorkspaceStart(
  env: AppEnv,
  dependencies: AppDependencies,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  job: WorkspaceStartJob,
  intent: WorkspaceStartIntent,
): Promise<boolean> {
  const retry = intent.kind === 'retry-failed-create'
  const retained = intent.kind === 'resume-retained-create'
  const completed = await storage.creationResult()
  if (
    job.kind === 'create' &&
    completed &&
    !retained &&
    (completed.ok || !retry)
  )
    return false
  if (await storage.job()) return false
  await requireActiveStartUsers(env.DB, job)
  const epoch = await storage.epoch()
  const state = await endpoint.readLifecycle()
  if (state?.startStop === 'pending') return false
  if (retry && (!state || !['stopped', 'error'].includes(state.state)))
    return false
  if (
    retry &&
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
  const prepared = retry ? await pinRetryCreation(env.DB, job) : job
  if (
    !(await storage.begin(
      {
        ...prepared,
        deadlineAt: startDeadlineAt(job, dependencies.now()),
      },
      epoch,
      intent,
    ))
  )
    return false
  await endpoint.beginLifecycleStart(job.kind)
  return true
}
