import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import type { WorkspaceAlarms } from '../features/alarms'
import type { WorkspaceStorage } from './platform-storage'
import type { AppDependencies, AppEnv } from '../env'
import { retrySandboxCleanup } from './cleanup'
import type { DurableLifecycle } from './durable'
import type { ImageCoordinator } from './image-coordinator'
import type { WorkspaceStartCoordinator } from './start-coordinator'
import type { StartJobStorage } from './start-types'
import { publishCreationResult } from './creation-publication'
import { START_JOB_KEY } from './start-storage'
import { retryAllocationCleanup } from './start-allocation-cleanup'
import { startAlarmDeadline } from './start-provider-retry'
import type { WorkspaceAccessStop } from './workspace-suspension'
import type { ComputerStopTask } from './computer-stop-task'

export async function runWorkspaceAlarm(input: {
  storage: WorkspaceStorage
  startStorage: WorkspaceStorage
  startJobs: StartJobStorage
  cleanupStorage: WorkspaceStorage
  alarms: WorkspaceAlarms
  env: AppEnv
  dependencies: AppDependencies
  images: ImageCoordinator
  starts: WorkspaceStartCoordinator
  lifecycle: DurableLifecycle
  accessStop: WorkspaceAccessStop
  computerStops: ComputerStopTask
}): Promise<void> {
  const { storage, env, dependencies, alarms, lifecycle } = input
  const run = await alarms.begin(dependencies.now(), (source) =>
    source.startsWith('lifecycle'),
  )
  const { due, recovering: recoveringRun } = run
  const requested = (source: string) =>
    !due.size || recoveringRun || due.has(source)
  let completedStart = false
  try {
    if (
      requested('lifecycle:computer-stops') &&
      (await input.computerStops.read())
    )
      await input.computerStops.advance()
    if (!(await lifecycle.read())) await alarms.set('lifecycle:access', null)
    if (await input.images.read()) {
      if (requested('lifecycle:image') || due.has('lifecycle')) {
        await alarms.set('lifecycle:image', dependencies.now() + 30_000)
        await alarms.set('lifecycle', null)
        await input.images.alarm()
      }
      return
    }
    if (due.has('lifecycle:changed') || recoveringRun) {
      try {
        await lifecycle.retryChanged()
      } catch (error) {
        captureUnexpectedWorkerFailure('workspace_projection_failed', error)
        /* The publication marker keeps its new retry time. */
      }
    }
    const legacyPublication =
      due.has('lifecycle') &&
      !(await alarms.has('lifecycle:publication')) &&
      Boolean(await input.startJobs.publication())
    if (due.has('lifecycle:publication') || legacyPublication || recoveringRun)
      await publishCreationResult(env, input.startJobs)
    const cleanupId = await storage.get('text', 'lifecycle:cleanup')
    const pending = await storage.get('job', START_JOB_KEY)
    const terminal = Boolean(
      pending &&
      (pending.cancelled ||
        pending.failure ||
        (pending.deadlineAt !== undefined &&
          pending.deadlineAt <= dependencies.now())),
    )
    const startRequested = requested('lifecycle:start') || due.has('lifecycle')
    const cleanupRequested =
      requested('lifecycle:cleanup') || due.has('lifecycle')
    let cleanupAttempted = false
    if (cleanupId && !terminal && (cleanupRequested || startRequested)) {
      cleanupAttempted = true
      await advanceCleanup(input.cleanupStorage, env, dependencies, cleanupId)
    }
    if (!terminal && (await storage.get('text', 'lifecycle:cleanup'))) {
      if (pending && startRequested)
        await input.startStorage.setAlarm(
          Math.min(
            (await storage.get('number', 'alarm:lifecycle:cleanup')) ??
              dependencies.now() + 30_000,
            startAlarmDeadline(pending, dependencies.now()),
          ),
        )
      await lifecycle.schedule()
      return
    }
    if (await input.starts.pending()) {
      if (terminal || startRequested) {
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
        } catch (error) {
          captureUnexpectedWorkerFailure('lifecycle_retry_failed', error)
          await input.startStorage.setAlarm(dependencies.now() + 30_000)
        }
      }
      if (await input.starts.pending()) {
        await lifecycle.schedule()
        return
      }
    }
    await input.startStorage.deleteAlarm()
    const state = await lifecycle.read()
    if (
      state &&
      (completedStart ||
        requested('lifecycle') ||
        requested('lifecycle:access')) &&
      (await input.accessStop.check(state.workspaceId)) !== undefined
    )
      return
    const remainingCleanup = await storage.get('text', 'lifecycle:cleanup')
    if (remainingCleanup && !cleanupAttempted && cleanupRequested)
      await advanceCleanup(
        input.cleanupStorage,
        env,
        dependencies,
        remainingCleanup,
      )
    else if (!remainingCleanup) await input.cleanupStorage.deleteAlarm()
    if (requested('lifecycle') || state?.startStop === 'pending') {
      try {
        await lifecycle.alarm()
        if (!state) await alarms.set('lifecycle', null)
      } catch (error) {
        captureUnexpectedWorkerFailure('lifecycle_retry_failed', error)
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
    await run.finish(dependencies.now())
  }
}

async function advanceCleanup(
  storage: WorkspaceStorage,
  env: AppEnv,
  dependencies: AppDependencies,
  cleanupId: string,
): Promise<void> {
  await storage.setAlarm(dependencies.now() + 30_000)
  try {
    if (
      (await retryAllocationCleanup(storage, env, dependencies)) &&
      (await retrySandboxCleanup(env, dependencies, cleanupId))
    ) {
      await storage.transaction(async (transaction) => {
        await transaction.delete('lifecycle:cleanup')
        await transaction.deleteAlarm()
      })
      return
    }
  } catch (error) {
    captureUnexpectedWorkerFailure('lifecycle_retry_failed', error)
    /* The cleanup owner keeps its retry time. */
  }
  await storage.setAlarm(dependencies.now() + 30_000)
}
