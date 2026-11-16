import { warnWorker } from '../warnings'
import { startAutomationRun, type AutomationRunRuntime } from './run-starter'
import {
  claimAutomationSchedule,
  dueAutomationSchedules,
  oldQueuedAutomationRuns,
} from './schedule-scan-data'
import { automationSchedule } from './schedules'
import {
  readAutomationTriggers,
  automationTriggerInputs,
} from './stored-triggers'

export async function scanAutomationSchedules(
  runtime: AutomationRunRuntime,
  limits: { dueAutomations: number; queuedRuns: number } = {
    dueAutomations: 50,
    queuedRuns: 50,
  },
): Promise<void> {
  const { env, dependencies } = runtime
  const now = dependencies.now()
  const [due, queued] = await Promise.all([
    dueAutomationSchedules(env.DB, now, limits.dueAutomations),
    oldQueuedAutomationRuns(env.DB, now, limits.queuedRuns),
  ])
  await Promise.all(
    due.map(async (automation) => {
      try {
        const schedule = automationSchedule(
          automationTriggerInputs(
            readAutomationTriggers(automation.triggersJson),
          ),
          automation.timeZone,
          true,
          now,
        )
        const trigger = schedule.triggers.find(
          (candidate) =>
            candidate.kind !== 'pull-request' &&
            automationSchedule(
              [candidate],
              automation.timeZone,
              true,
              automation.nextRunAt - 1,
            ).nextRunAt === automation.nextRunAt,
        )
        if (!trigger || trigger.kind === 'pull-request')
          throw new Error('The due time has no matching schedule.')
        const runId = await claimAutomationSchedule(
          env.DB,
          automation,
          {
            kind: 'schedule',
            schedule: trigger.kind,
            scheduledAt: automation.nextRunAt,
          },
          schedule.nextRunAt,
          now,
          dependencies,
        )
        if (runId) await startAutomationRun(runtime, automation.orgId, runId)
      } catch {
        warnWorker({ kind: 'automation_schedule_failed' })
      }
    }),
  )
  for (const run of queued) {
    try {
      await startAutomationRun(runtime, run.orgId, run.id)
    } catch {
      warnWorker({ kind: 'automation_queued_start_failed' })
    }
  }
}
