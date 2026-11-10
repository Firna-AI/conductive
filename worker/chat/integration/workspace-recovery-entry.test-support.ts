import { readDeviceRecord } from '../../../src/shared/device-read'
import { readDeviceValue } from '../../devices/storage'
import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import { advanceScheduledAlarms } from '../../lifecycle/scheduled-alarms.test-support'
import type { WorkspaceCompositionEnv } from '../workspace-integration'
import { Workspace as ReviewWorkspace } from './workspace-review-entry.test-support'

export { default } from './workspace-review-entry.test-support'

export class Workspace extends ReviewWorkspace {
  private readonly pendingWork: Promise<unknown>[]
  private readonly recoveryClock: { now: number }
  private advanceRuns = 0
  private lifecycleRuns = 0
  private advancedLifecycleRuns = 0

  constructor(context: DurableObjectState, env: WorkspaceCompositionEnv) {
    const pending: Promise<unknown>[] = []
    const clock = { now: DEVICE_TEST_NOW }
    const waitUntil = context.waitUntil.bind(context)
    context.waitUntil = (work) => {
      pending.push(work)
      waitUntil(work)
    }
    super(context, env, () => clock.now)
    this.pendingWork = pending
    this.recoveryClock = clock
  }

  override async advanceStartAlarm(at = this.recoveryClock.now): Promise<void> {
    const before = this.lifecycleRuns
    this.advanceRuns = await advanceScheduledAlarms(
      {
        now: () => this.recoveryClock.now,
        setTime: (now) => {
          this.recoveryClock.now = now
        },
      },
      at,
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
    this.advancedLifecycleRuns = this.lifecycleRuns - before
  }

  recoveryAdvanceRuns(): number {
    return this.advanceRuns
  }

  recoveryLifecycleRuns(): number {
    return this.advancedLifecycleRuns
  }

  protected override async alarmLifecycle(): Promise<void> {
    this.lifecycleRuns++
    await super.alarmLifecycle()
  }

  recoveryAlarmAt(): Promise<number | null> {
    return this.ctx.storage.getAlarm()
  }

  async recoveryLifecycleAlarmAt(): Promise<number | null> {
    return (await this.ctx.storage.get<number>('alarm:lifecycle')) ?? null
  }

  async recoveryRunnerAlarmAt(): Promise<number | null> {
    return (await this.ctx.storage.get<number>('alarm:runner')) ?? null
  }

  async storedDeviceRequests() {
    while (this.pendingWork.length)
      await Promise.all(this.pendingWork.splice(0))
    return Promise.all(
      [
        ...(
          await this.ctx.storage.list({ prefix: 'devices:v1:request:' })
        ).keys(),
      ].map(async (key) =>
        readDeviceRecord(await readDeviceValue(this.ctx.storage, key)),
      ),
    )
  }
}
