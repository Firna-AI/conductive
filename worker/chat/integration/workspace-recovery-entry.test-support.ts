import { readDeviceRecord } from '../../../src/shared/device-read'
import { readDeviceValue } from '../../devices/storage'
import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import type { WorkspaceCompositionEnv } from '../workspace-integration'
import { Workspace as ReviewWorkspace } from './workspace-review-entry.test-support'

export { default } from './workspace-review-entry.test-support'

export class Workspace extends ReviewWorkspace {
  private readonly pendingWork: Promise<unknown>[]
  private readonly recoveryClock: { now: number }

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

  setRecoveryTime(now: number): void {
    this.recoveryClock.now = now
  }

  recoveryAlarmAt(): Promise<number | null> {
    return this.ctx.storage.getAlarm()
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
