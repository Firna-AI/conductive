import { createApp } from '../../application'
import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import { NativeAlarmWorkspace } from '../../lifecycle/native-alarm-workspace.test-support'
import { START_JOB_KEY } from '../../lifecycle/start-storage'
import type { StoredWorkspaceStartJob } from '../../lifecycle/start-job-codec'

export class Workspace extends NativeAlarmWorkspace {
  async readStartPhase() {
    return (await this.ctx.storage.get<StoredWorkspaceStartJob>(START_JOB_KEY))
      ?.phase
  }
}

export default createApp({ now: () => DEVICE_TEST_NOW })
