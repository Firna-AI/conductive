import { warnWorker } from '../warnings'
import type { WorkspaceErrorReporting } from '../error-reporting/workspace'

/** Slow alarm work leaves the platform handler free for security deadlines. */
export class WorkspaceAlarmTasks {
  private readonly tasks = new Map<string, Promise<void>>()
  private readonly context: DurableObjectState
  private readonly reporting?: WorkspaceErrorReporting

  constructor(
    context: DurableObjectState,
    reporting?: WorkspaceErrorReporting,
  ) {
    this.context = context
    this.reporting = reporting
  }

  start(source: string, work: () => Promise<void>): void {
    if (this.tasks.has(source)) return
    const pending = (
      this.reporting
        ? this.reporting.checked('workspace_alarm_failed', work)
        : work()
    ).finally(() => this.tasks.delete(source))
    this.tasks.set(source, pending)
    this.context.waitUntil(
      pending.catch(() => {
        warnWorker({ kind: 'workspace_alarm_failed' })
      }),
    )
  }

  async settled(): Promise<void> {
    await Promise.all(this.tasks.values())
  }
}
