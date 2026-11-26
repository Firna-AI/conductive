import type { WorkspaceAlarms } from './features/alarms'
import type { WorkspaceFeatures } from './features/workspace'
import type { ReceiverStorage } from './members/receiver-storage'
import { QUEUE_FIX_REPORT } from './chat/queue-fix-records'

export async function expireWorkspacePreviews(
  storage: ReceiverStorage,
  alarms: WorkspaceAlarms,
  previews: WorkspaceFeatures['previews'],
): Promise<void> {
  await previews.expire()
  const id = await storage.get<string>('previews:workspace-id')
  if (id) await alarms.set('previews', await previews.nextExpiry(id))
}

/** A failed report retry, which its task already logged. */
class ReportRetryFailed extends Error {}

/**
 * A failed retry keeps its due time, and the end of the run moves it later.
 * The other owners of the run still run. Other errors end the run.
 */
async function retryAutomationReport(
  alarms: WorkspaceAlarms,
  startedAt: number,
  report: () => Promise<void>,
): Promise<void> {
  try {
    await alarms.run('automation-report', startedAt, async () => {
      try {
        await report()
      } catch {
        throw new ReportRetryFailed()
      }
    })
  } catch (error) {
    if (!(error instanceof ReportRetryFailed)) throw error
  }
}

export async function runWorkspaceAlarms(
  alarms: WorkspaceAlarms,
  now: () => number,
  tasks: {
    continuation?(): Promise<void>
    repositoryChange?(): Promise<void>
    lifecycleAllowed?(): Promise<boolean>
    lifecycle(): Promise<void>
    github(): Promise<void>
    previews(): Promise<void>
    devices(): Promise<void>
    publishRevocations(): Promise<void>
    automationReport?(): Promise<void>
    queueFixReport?(): Promise<void>
    sessionWatches?(): Promise<void>
  },
  options: { securityHandled?: boolean; fallbackLifecycle?: boolean } = {},
): Promise<void> {
  const startedAt = now()
  const run = await alarms.begin(
    startedAt,
    (source) =>
      !source.startsWith('lifecycle') &&
      (!options.securityHandled ||
        !['browser', 'runner', 'devices', 'secrets'].includes(source)),
  )
  const { due } = run
  try {
    if (tasks.continuation)
      await alarms.run('continue', startedAt, tasks.continuation)
    if (tasks.repositoryChange)
      await alarms.run('repository-change', startedAt, tasks.repositoryChange)
    if (
      (!due.size && options.fallbackLifecycle !== false) ||
      [...due].some((source) => source.startsWith('lifecycle'))
    ) {
      if (!tasks.lifecycleAllowed || (await tasks.lifecycleAllowed()))
        await tasks.lifecycle()
      else {
        const held = await alarms.begin(startedAt, (source) =>
          source.startsWith('lifecycle'),
        )
        await held.finish(now())
      }
    }
    if (due.has('github') || due.has('baseChange')) await tasks.github()
    if (due.has('previews')) await tasks.previews()
    if (due.has('automation-report') && tasks.automationReport)
      await retryAutomationReport(alarms, startedAt, tasks.automationReport)
    if (due.has(QUEUE_FIX_REPORT)) await tasks.queueFixReport?.()
    if (due.has('session-watches') && tasks.sessionWatches)
      await alarms.run('session-watches', startedAt, tasks.sessionWatches)
    if (!options.securityHandled)
      await alarms.run('devices', startedAt, tasks.devices)
    await tasks.publishRevocations()
  } finally {
    await run.finish(now())
  }
}
