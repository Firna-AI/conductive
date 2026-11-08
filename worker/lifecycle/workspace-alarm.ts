import type { WorkspaceStorage } from './platform-storage'
import type { AppDependencies, AppEnv } from '../env'
import { retrySandboxCleanup } from './cleanup'
import type { DurableLifecycle } from './durable'
import type { ImageCoordinator } from './image-coordinator'
import type { WorkspaceStartCoordinator } from './start-coordinator'
import { START_JOB_KEY } from './start-storage'
import { retryAllocationCleanup } from './start-allocation-cleanup'
import { startAlarmDeadline } from './start-provider-retry'

export async function runWorkspaceAlarm(input: {
  storage: WorkspaceStorage
  env: AppEnv
  dependencies: AppDependencies
  images: ImageCoordinator
  starts: WorkspaceStartCoordinator
  lifecycle: DurableLifecycle
}): Promise<void> {
  const { storage, env, dependencies } = input
  if (await input.images.read()) {
    await input.images.alarm()
    return
  }
  if (await input.starts.pending()) {
    try {
      if (!(await input.starts.advance())) {
        const job = await storage.get('job', START_JOB_KEY)
        const now = dependencies.now()
        const retryAt =
          job && !job.cancelled && !job.failure
            ? (job.providerRetry?.retryAt ?? 0)
            : 0
        await storage.setAlarm(
          Math.min(
            Math.max(now + 1_000, retryAt),
            startAlarmDeadline(job, now),
          ),
        )
      }
    } catch {
      await storage.setAlarm(dependencies.now() + 30_000)
    }
    return
  }
  const cleanupId = await storage.get('text', 'lifecycle:cleanup')
  if (cleanupId) {
    try {
      if (
        (await retryAllocationCleanup(storage, env, dependencies)) &&
        (await retrySandboxCleanup(env, dependencies, cleanupId))
      ) {
        await storage.delete('lifecycle:cleanup')
        return
      }
    } catch {
      /* Keep the ownership record until a later alarm deletes the resource. */
    }
    await storage.setAlarm(dependencies.now() + 30_000)
    return
  }
  try {
    await input.lifecycle.alarm()
  } catch {
    await storage.setAlarm(dependencies.now() + 30_000)
  }
}
