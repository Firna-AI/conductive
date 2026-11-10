import { warnWorker } from '../warnings'

/** Slow alarm work leaves the platform handler free for security deadlines. */
export class WorkspaceAlarmTasks {
  private readonly tasks = new Map<string, Promise<void>>()
  private readonly context: DurableObjectState

  constructor(context: DurableObjectState) {
    this.context = context
  }

  start(source: string, work: () => Promise<void>): void {
    if (this.tasks.has(source)) return
    const pending = work().finally(() => this.tasks.delete(source))
    this.tasks.set(source, pending)
    this.context.waitUntil(
      pending.catch(() => {
        warnWorker(
          'Workspace alarm work failed. Its durable deadline will retry.',
        )
      }),
    )
  }

  async settled(): Promise<void> {
    await Promise.all(this.tasks.values())
  }
}
