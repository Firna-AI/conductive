import type { AppEnv } from '../env'
import { requireActiveStartUsers } from './start-access'
import { JobTimeLimit } from './job-time-limit'
import { startTimeLimitReached } from './start-provider-retry'
import type { StartJobStorage } from './start-types'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'

export async function runnerStartConnected(
  endpoint: WorkspaceLifecycleEndpoint,
): Promise<boolean> {
  const state = await endpoint.readLifecycle()
  if (!state?.start?.steps.some((step) => step.id === 'runner'))
    await endpoint.lifecycleStep('runner', 'Starting the agent', 'running')
  return state?.runnerConnected ?? false
}

export async function prepareStartSuccess(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  now: () => number,
): Promise<boolean> {
  const job = await storage.job()
  if (!job || job.cancelled || job.failure) return false
  await requireActiveStartUsers(env.DB, job)
  const current = await storage.job()
  if (!current || current.cancelled || current.failure) return false
  if (startTimeLimitReached(current, now())) throw new JobTimeLimit('start')
  await endpoint.lifecyclePrepared()
  return true
}
