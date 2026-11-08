import { createApp } from '../application'
import type { WorkspaceCompositionEnv } from '../chat/workspace-integration'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { advanceScheduledAlarms } from '../lifecycle/scheduled-alarms.test-support'
import { Workspace as FeatureWorkspace } from './entry.test-support'
import type { StoredWorkspaceStartJob } from '../lifecycle/start-job-codec'

const CLOCK_KEY = '__test:creation-clock'

export class Workspace extends FeatureWorkspace {
  private readonly testClock: { value: number }

  constructor(context: DurableObjectState, env: WorkspaceCompositionEnv) {
    const clock = { value: DEVICE_TEST_NOW }
    super(context, env, () => clock.value)
    this.testClock = clock
    context.blockConcurrencyWhile(async () => {
      clock.value =
        (await context.storage.get<number>(CLOCK_KEY)) ?? DEVICE_TEST_NOW
    })
  }

  async alarm(): Promise<void> {
    const job = await this.ctx.storage.get<StoredWorkspaceStartJob>(
      'lifecycle:start-job',
    )
    if (job?.kind === 'create' && job.phase !== 'records') return
    return super.alarm()
  }

  async advanceStartAlarm(): Promise<void> {
    const at = await this.ctx.storage.getAlarm()
    if (at !== null) await this.advanceTo(Math.max(this.testClock.value, at))
  }

  advanceTo(at: number): Promise<number> {
    return advanceScheduledAlarms(
      {
        now: () => this.testClock.value,
        setTime: async (value) => {
          this.testClock.value = value
          await this.ctx.storage.put(CLOCK_KEY, value)
        },
      },
      at,
      () => [{ storage: this.ctx.storage, fire: () => super.alarm() }],
    )
  }

  readTestAlarm(): Promise<number | null> {
    return this.ctx.storage.getAlarm()
  }
}

export default createApp({ now: () => DEVICE_TEST_NOW })
