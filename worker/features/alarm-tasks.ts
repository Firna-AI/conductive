import { warnWorker } from '../warnings'

/** Slow alarm work leaves the platform handler free for security deadlines. */
export class WorkspaceAlarmTasks {
  private readonly tasks = new Map<string, Promise<void>>()
  private readonly context: DurableObjectState

  constructor(context: DurableObjectState) {
    this.context = context
  }

  has(source: string): boolean {
    return this.tasks.has(source)
  }

  start(source: string, work: () => Promise<void>): void {
    if (this.tasks.has(source)) return
    const pending = work().finally(() => this.tasks.delete(source))
    this.tasks.set(source, pending)
    this.context.waitUntil(
      pending.catch(() => {
        warnWorker({ kind: 'workspace_alarm_failed' })
      }),
    )
  }

  async settled(): Promise<void> {
    while (this.tasks.size) await Promise.all(this.tasks.values())
  }
}
