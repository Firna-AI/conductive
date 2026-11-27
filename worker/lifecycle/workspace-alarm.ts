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
import { startRestorePollAt } from './start-completion'
import type { WorkspaceAccessStop } from './workspace-suspension'
import type { WorkspaceArchive } from './archive-state'
import type { ComputerStopTask } from './computer-stop-task'
import type { QueueTurn } from '../chat/queue-turn'
import { StartSuperseded } from './start-guard'
import type { StartJobRecords } from './start-job-records'
import { restartDeadline } from './durable-restart'
import { providerRetryPending } from './provider-retry'

const START_PHASE_ORDER = {
  records: 0,
  machine: 1,
  ready: 2,
  fetch: 3,
  branch: 4,
  startup: 5,
  terminal: 6,
  'terminal-password': 7,
  runner: 8,
} as const

export async function runWorkspaceAlarm(input: {
  turn?: QueueTurn
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
  archive: WorkspaceArchive
  computerStops: ComputerStopTask
  runs?: Pick<StartJobRecords, 'begin'>
  restart?: () => Promise<void>
}): Promise<void> {
  const { storage, env, dependencies, alarms, lifecycle } = input
  const startedAt = dependencies.now()
  const run = await alarms.begin(startedAt, (source) =>
    source.startsWith('lifecycle'),
  )
  const record = await input.runs?.begin(run.dueAt)
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
      } catch {
        /* The publication marker keeps its new retry time. */
      }
    }
    if (requested('lifecycle:archive')) await input.archive.advance()
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
          let finished = false
          let job = await storage.get('job', START_JOB_KEY)
          for (
            let advances = 0;
            // The first advance always runs, so slow earlier owners of the
            // run never leave a due start without progress.
            advances === 0 ||
            (advances < 6 && dependencies.now() - startedAt < 5_000);
            advances++
          ) {
            const before = job
            finished = await input.starts.advance(input.turn)
            if (finished) break
            job = await storage.get('job', START_JOB_KEY)
            if (
              !before ||
              !job ||
              before.attempt !== job.attempt ||
              before.phase === 'records' ||
              job.phase === 'runner' ||
              job.cancelled ||
              job.failure ||
              providerRetryPending(job.providerRetry, dependencies.now()) ||
              START_PHASE_ORDER[job.phase] <= START_PHASE_ORDER[before.phase]
            )
              break
          }
          if (finished) {
            if (!(await input.starts.pending())) {
              await input.startStorage.deleteAlarm()
              await lifecycle.schedule()
              completedStart = true
            }
          } else {
            const now = dependencies.now()
            const retryAt =
              job && !job.cancelled && !job.failure
                ? (job.providerRetry?.retryAt ?? 0)
                : 0
            const polling =
              job &&
              !job.cancelled &&
              !job.failure &&
              !providerRetryPending(job.providerRetry, now) &&
              job.waitStartedAt !== undefined &&
              now - job.waitStartedAt < 5_000 &&
              (job.phase === 'ready' ||
                (job.processId !== null &&
                  (job.phase === 'fetch' ||
                    job.phase === 'branch' ||
                    job.phase === 'startup' ||
                    job.phase === 'terminal')))
            await input.startStorage.setAlarm(
              Math.min(
                startAlarmDeadline(job, now),
                startRestorePollAt(job),
                job?.phase === 'runner' && !job.cancelled && !job.failure
                  ? Infinity
                  : Math.max(now + (polling ? 250 : 1_000), retryAt),
              ),
            )
          }
        } catch (error) {
          await input.startStorage.setAlarm(
            dependencies.now() +
              (error instanceof StartSuperseded ? 1_000 : 30_000),
          )
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
        if (await lifecycle.alarm()) await input.restart?.()
        await input.starts.startAfterStop()
        if (!state) await alarms.set('lifecycle', null)
      } catch {
        const current = await lifecycle.read()
        const now = dependencies.now()
        const disk = current?.diskRetentionDeadlineAt ?? 0
        const restart = current && restartDeadline(current)
        await alarms.set(
          'lifecycle',
          Math.min(
            now + 30_000,
            disk > now ? disk : Infinity,
            restart && restart > now ? restart : Infinity,
          ),
        )
      }
    }
  } finally {
    await run.finish(dependencies.now())
    await record?.end()
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
  } catch {
    /* The cleanup owner keeps its retry time. */
  }
  await storage.setAlarm(dependencies.now() + 30_000)
}
