import app, { Workspace as FeatureWorkspace } from './entry.test-support'
import type { StoredWorkspaceStartJob } from '../lifecycle/start-job-codec'

export class Workspace extends FeatureWorkspace {
  async alarm(): Promise<void> {
    const job = await this.ctx.storage.get<StoredWorkspaceStartJob>(
      'lifecycle:start-job',
    )
    if (
      job?.kind === 'create' &&
      job.phase === 'machine' &&
      !job.allocatedSandboxId
    )
      return
    return super.alarm()
  }

  advanceStartAlarm(): Promise<void> {
    return super.alarm()
  }
}

export default app
