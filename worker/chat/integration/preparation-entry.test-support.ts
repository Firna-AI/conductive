import app, { Workspace as ProductionWorkspace } from '../../index'
import { START_JOB_KEY } from '../../lifecycle/start-storage'
import type { StoredWorkspaceStartJob } from '../../lifecycle/start-job-codec'

export class Workspace extends ProductionWorkspace {
  advanceStartAlarm(): Promise<void> {
    return this.alarm()
  }

  async readStartPhase() {
    return (await this.ctx.storage.get<StoredWorkspaceStartJob>(START_JOB_KEY))
      ?.phase
  }
}

export default app
