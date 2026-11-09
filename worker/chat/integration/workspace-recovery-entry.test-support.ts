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
    this.advanceRuns = await advanceScheduledAlarms(
      {
        now: () => this.recoveryClock.now,
        setTime: (now) => {
          this.recoveryClock.now = now
        },
      },
      at,
      () => [{ storage: this.ctx.storage, fire: () => this.alarm() }],
    )
  }

  recoveryAdvanceRuns(): number {
    return this.advanceRuns
  }

  recoveryAlarmAt(): Promise<number | null> {
    return this.ctx.storage.getAlarm()
  }

  async issueTurnToken(turnId: string): Promise<string | null> {
    const workspaceId = await this.chat.store.workspaceId()
    return workspaceId
      ? this.chat.runLifecycle(() =>
          this.chat.turnTokens.forRunningTurn(workspaceId, turnId),
        )
      : null
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
