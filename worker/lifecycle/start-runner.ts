import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { requireActiveStartUsers } from './start-access'
import { failedStartJob } from './start-failure'
import {
  readStartForAdvance,
  startTimeLimitReached,
} from './start-provider-retry'
import type { StartJobStorage } from './start-types'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'

export async function applyStartRunnerReady(
  env: AppEnv,
  storage: StartJobStorage,
  endpoint: WorkspaceLifecycleEndpoint,
  now: () => number,
  apply: () => Promise<void>,
): Promise<void> {
  const job = await readStartForAdvance(storage, endpoint, now())
  if (job) {
    await storage.schedule(now())
    if (job.cancelled || job.failure || startTimeLimitReached(job, now()))
      return
    try {
      await requireActiveStartUsers(env.DB, job)
    } catch (error) {
      if (!(
        error instanceof HttpError &&
        ['user_suspended', 'org_suspended'].includes(error.code)
      ))
        throw error
      await storage.update(failedStartJob(job, error, now()))
      return
    }
    if (startTimeLimitReached(job, now())) return
  }
  await apply()
  if (job) await storage.schedule(now())
}
