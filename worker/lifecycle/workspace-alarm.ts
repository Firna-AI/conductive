import type { WorkspaceAlarms } from '../features/alarms'
import type { WorkspaceStorage } from './platform-storage'
import type { AppDependencies, AppEnv } from '../env'
import { retrySandboxCleanup } from './cleanup'
import type { DurableLifecycle } from './durable'
import type { ImageCoordinator } from './image-coordinator'
import type { WorkspaceStartCoordinator } from './start-coordinator'
import { START_JOB_KEY } from './start-storage'
import { retryAllocationCleanup } from './start-allocation-cleanup'
import { startAlarmDeadline } from './start-provider-retry'
import type { WorkspaceAccessStop } from './workspace-suspension'

export async function runWorkspaceAlarm(input: {
  storage: WorkspaceStorage
  startStorage: WorkspaceStorage
  cleanupStorage: WorkspaceStorage
  alarms: WorkspaceAlarms
  env: AppEnv
  dependencies: AppDependencies
  images: ImageCoordinator
  starts: WorkspaceStartCoordinator
  lifecycle: DurableLifecycle
  accessStop: WorkspaceAccessStop
}): Promise<void> {
  const { storage, env, dependencies, alarms, lifecycle } = input
  const due = await alarms.take(dependencies.now())
  const requested = (source: string) => !due.size || due.has(source)
  let completedStart = false
  try {
    if (!(await lifecycle.read())) await alarms.set('lifecycle:access', null)
    if (await input.images.read()) {
      if (requested('lifecycle:image') || due.has('lifecycle')) {
        await alarms.set('lifecycle:image', dependencies.now() + 30_000)
        await alarms.set('lifecycle', null)
        await input.images.alarm()
      }
      return
    }
    if (due.has('lifecycle:changed')) {
      try {
        await lifecycle.retryChanged()
      } catch {
        /* The publication marker keeps its new retry time. */
      }
    }
    if (await input.starts.pending()) {
      if (requested('lifecycle:start') || due.has('lifecycle')) {
        try {
          if (await input.starts.advance()) {
            if (!(await input.starts.pending())) {
              await input.startStorage.deleteAlarm()
              await lifecycle.schedule()
              completedStart = true
            }
          } else {
            const job = await storage.get('job', START_JOB_KEY)
            const now = dependencies.now()
            const retryAt =
              job && !job.cancelled && !job.failure
                ? (job.providerRetry?.retryAt ?? 0)
                : 0
            await input.startStorage.setAlarm(
              job?.phase === 'runner' && !job.cancelled && !job.failure
                ? startAlarmDeadline(job, now)
                : Math.min(
                    Math.max(now + 1_000, retryAt),
                    startAlarmDeadline(job, now),
                  ),
            )
          }
        } catch {
          await input.startStorage.setAlarm(dependencies.now() + 30_000)
        }
      }
      if (await input.starts.pending()) {
        await lifecycle.schedule()
        if (await storage.get('job', START_JOB_KEY)) return
      }
    }
    if (!(await input.starts.pending())) await input.startStorage.deleteAlarm()
    const state = await lifecycle.read()
    if (
      state &&
      (completedStart ||
        requested('lifecycle') ||
        requested('lifecycle:access')) &&
      (await input.accessStop.check(state.workspaceId)) !== undefined
    )
      return
    const cleanupId = await storage.get('text', 'lifecycle:cleanup')
    if (cleanupId && (requested('lifecycle:cleanup') || due.has('lifecycle'))) {
      await input.cleanupStorage.setAlarm(dependencies.now() + 30_000)
      try {
        if (
          (await retryAllocationCleanup(storage, env, dependencies)) &&
          (await retrySandboxCleanup(env, dependencies, cleanupId))
        ) {
          await input.cleanupStorage.transaction(async (transaction) => {
            await transaction.delete('lifecycle:cleanup')
            await transaction.deleteAlarm()
          })
        } else await input.cleanupStorage.setAlarm(dependencies.now() + 30_000)
      } catch {
        await input.cleanupStorage.setAlarm(dependencies.now() + 30_000)
      }
    } else if (!cleanupId) await input.cleanupStorage.deleteAlarm()
    if (requested('lifecycle') || state?.startStop === 'pending') {
      try {
        await lifecycle.alarm()
        if (!state) await alarms.set('lifecycle', null)
      } catch {
        const deadlineAt = (await lifecycle.read())?.diskRetentionDeadlineAt
        const now = dependencies.now()
        await alarms.set(
          'lifecycle',
          deadlineAt !== undefined && deadlineAt > now
            ? Math.min(now + 30_000, deadlineAt)
            : now + 30_000,
        )
      }
    }
  } finally {
    await alarms.schedule()
  }
}
