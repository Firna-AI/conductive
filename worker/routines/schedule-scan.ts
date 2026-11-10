import { warnWorker } from '../warnings'
import { startRoutineRun, type RoutineRunRuntime } from './run-starter'
import {
  claimRoutineSchedule,
  dueRoutineSchedules,
  oldQueuedRoutineRuns,
} from './schedule-scan-data'
import { routineSchedule } from './schedules'
import { readRoutineTriggers, routineTriggerInputs } from './stored-triggers'

export async function scanRoutineSchedules(
  runtime: RoutineRunRuntime,
  limits: { dueRoutines: number; queuedRuns: number } = {
    dueRoutines: 50,
    queuedRuns: 50,
  },
): Promise<void> {
  const { env, dependencies } = runtime
  const now = dependencies.now()
  const [due, queued] = await Promise.all([
    dueRoutineSchedules(env.DB, now, limits.dueRoutines),
    oldQueuedRoutineRuns(env.DB, now, limits.queuedRuns),
  ])
  await Promise.all(
    due.map(async (routine) => {
      try {
        const schedule = routineSchedule(
          routineTriggerInputs(readRoutineTriggers(routine.triggersJson)),
          routine.timeZone,
          true,
          now,
        )
        const trigger = schedule.triggers.find(
          (candidate) =>
            candidate.kind !== 'pull-request' &&
            routineSchedule(
              [candidate],
              routine.timeZone,
              true,
              routine.nextRunAt - 1,
            ).nextRunAt === routine.nextRunAt,
        )
        if (!trigger || trigger.kind === 'pull-request')
          throw new Error('The due time has no matching schedule.')
        const runId = await claimRoutineSchedule(
          env.DB,
          routine,
          {
            kind: 'schedule',
            schedule: trigger.kind,
            scheduledAt: routine.nextRunAt,
          },
          schedule.nextRunAt,
          now,
          dependencies,
        )
        if (runId) await startRoutineRun(runtime, routine.orgId, runId)
      } catch {
        warnWorker(
          'A routine schedule could not run. The next scan will try again.',
        )
      }
    }),
  )
  for (const run of queued) {
    try {
      await startRoutineRun(runtime, run.orgId, run.id)
    } catch {
      warnWorker(
        'A queued routine run could not start. The next scan will try again.',
      )
    }
  }
}
