import { Workspace as ProductionWorkspace } from '../workspace'
import type {
  WorkspaceCompositionEnv,
  WorkspaceChatResolvers,
} from '../chat/workspace-integration'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import type { ConnectionScheduler } from '../security/connection-access'
import { advanceScheduledAlarms } from './scheduled-alarms.test-support'
import type { StoredWorkspaceStartJob } from './start-job-codec'
import type { WorkspaceStartIntent } from './start-types'

const CLOCK_KEY = '__test:workspace-alarm-clock'

export class NativeAlarmWorkspace extends ProductionWorkspace {
  private readonly alarmClock: { now: number }
  private readonly alarmNow: () => number

  constructor(
    context: DurableObjectState,
    env: WorkspaceCompositionEnv,
    now?: () => number,
    resolvers: WorkspaceChatResolvers = {},
    schedule?: ConnectionScheduler,
  ) {
    const clock = { now: DEVICE_TEST_NOW }
    const readNow = now ?? (() => clock.now)
    super(context, env, readNow, resolvers, schedule)
    this.alarmClock = clock
    this.alarmNow = readNow
    context.blockConcurrencyWhile(async () => {
      clock.now =
        (await context.storage.get<number>(CLOCK_KEY)) ?? DEVICE_TEST_NOW
    })
  }

  readStartAlarm(): Promise<number | null> {
    return this.ctx.storage.getAlarm()
  }

  testAlarmTime(): number {
    return this.alarmNow()
  }

  async queueLifecycleStart(
    job: StoredWorkspaceStartJob,
    intent?: WorkspaceStartIntent,
  ): Promise<boolean> {
    const accepted = await super.queueLifecycleStart(job, intent)
    if (accepted && job.phase === 'records') await this.advanceStartAlarm()
    return accepted
  }

  async advanceStartAlarm(at?: number): Promise<void> {
    const stored = await this.readStartAlarm()
    await advanceScheduledAlarms(
      {
        now: this.alarmNow,
        setTime: async (now) => {
          this.alarmClock.now = now
          await this.ctx.storage.put(CLOCK_KEY, now)
        },
      },
      at ?? Math.max(this.alarmNow(), stored ?? this.alarmNow()),
      () => [
        {
          storage: this.ctx.storage,
          fire: async () => {
            await this.alarm()
            await this.settledAlarms()
          },
        },
      ],
    )
  }
}
