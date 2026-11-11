import type { WorkspaceCompositionEnv } from '../chat/workspace-integration'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { Workspace as FeatureWorkspace } from '../features/entry.test-support'
import { advanceScheduledAlarms } from './scheduled-alarms.test-support'

export class Workspace extends FeatureWorkspace {
  private readonly pendingStopClock: { now: number }

  constructor(context: DurableObjectState, env: WorkspaceCompositionEnv) {
    const clock = { now: DEVICE_TEST_NOW }
    super(context, env, () => clock.now)
    this.pendingStopClock = clock
  }

  advanceOneAlarm(at: number): Promise<number> {
    let dispatched = false
    return advanceScheduledAlarms(
      {
        now: () => this.pendingStopClock.now,
        setTime: (now) => {
          this.pendingStopClock.now = now
        },
      },
      at,
      () =>
        dispatched
          ? []
          : [
              {
                storage: this.ctx.storage,
                fire: async () => {
                  dispatched = true
                  await this.alarm()
                  await this.settledAlarms()
                },
              },
            ],
    )
  }

  async readAlarmTimes() {
    return {
      next: await this.ctx.storage.getAlarm(),
      lifecycle: await this.ctx.storage.get<number>('alarm:lifecycle'),
      access: await this.ctx.storage.get<number>('alarm:lifecycle:access'),
    }
  }
}
