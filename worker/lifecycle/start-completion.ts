import type { AppEnv } from '../env'
import { requireActiveStartUsers } from './start-access'
import { JobTimeLimit } from './job-time-limit'
import { startTimeLimitReached } from './start-provider-retry'
import type { StartJobStorage } from './start-types'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import {
  completeActivationFence,
  closeActivationFence,
} from './import-activation-fence'

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
  if (current.kind === 'activate') {
    if (current.phase !== 'runner' || !current.activation.finished)
      throw new Error('The import final report is not committed.')
    if (!(await completeActivationFence(env.DB, current, now()))) return false
    const latest = await storage.job()
    if (
      !latest ||
      latest.attempt !== current.attempt ||
      latest.cancelled ||
      latest.failure ||
      startTimeLimitReached(latest, now())
    ) {
      await closeActivationFence(env.DB, current, 'failed')
      if (latest && startTimeLimitReached(latest, now()))
        throw new JobTimeLimit('start')
      return false
    }
    await storage.update({
      ...current,
      activation: { ...current.activation, cleanupPending: true },
    })
  }
  await endpoint.lifecyclePrepared()
  if (current.kind === 'activate') {
    const prepared = await storage.job()
    if (
      !prepared ||
      prepared.attempt !== current.attempt ||
      prepared.cancelled ||
      prepared.failure ||
      startTimeLimitReached(prepared, now())
    ) {
      await closeActivationFence(env.DB, current, 'failed')
      if (prepared && startTimeLimitReached(prepared, now()))
        throw new JobTimeLimit('start')
      return false
    }
  }
  return true
}
