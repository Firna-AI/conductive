import app, { Workspace as ProductionWorkspace } from '../../index'
import type { WorkspaceCompositionEnv } from '../workspace-integration'
import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import { START_JOB_KEY } from '../../lifecycle/start-storage'
import type { StoredWorkspaceStartJob } from '../../lifecycle/start-job-codec'
import type { WorkspaceStartIntent } from '../../lifecycle/start-types'

/** Only test controls differ. All state changes use the production object. */
export class Workspace extends ProductionWorkspace {
  private queued = 0
  private readonly queueReaders: { after: number; resolve: () => void }[] = []
  private stopAfterRead = false

  constructor(
    context: DurableObjectState,
    env: WorkspaceCompositionEnv,
    now: () => number = () => DEVICE_TEST_NOW,
  ) {
    super(context, env, now)
  }

  stopAfterNextRead(): void {
    this.stopAfterRead = true
  }

  async readLifecycle() {
    const state = await super.readLifecycle()
    if (this.stopAfterRead) {
      this.stopAfterRead = false
      await this.lifecycleStopped()
    }
    return state
  }

  async queueLifecycleStart(
    job: StoredWorkspaceStartJob,
    intent?: WorkspaceStartIntent,
  ): Promise<boolean> {
    const accepted = await super.queueLifecycleStart(job, intent)
    if (accepted) {
      this.queued++
      for (const reader of this.queueReaders)
        if (this.queued > reader.after) reader.resolve()
    }
    return accepted
  }

  waitForQueuedStart(after: number): Promise<void> {
    return this.queued > after
      ? Promise.resolve()
      : new Promise((resolve) => this.queueReaders.push({ after, resolve }))
  }

  readStartCheckpoint(): Promise<StoredWorkspaceStartJob | undefined> {
    return this.ctx.storage.get(START_JOB_KEY)
  }

  advanceStartAlarm(): Promise<void> {
    return this.alarm()
  }
}

export default app
