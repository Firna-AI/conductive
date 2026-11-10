import { readDeviceRecord } from '../../../src/shared/device-read'
import { readDeviceValue } from '../../devices/storage'
import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import { advanceScheduledAlarms } from '../../lifecycle/scheduled-alarms.test-support'
import { heldOperation } from '../../test-support/held-operation'
import type { WorkspaceCompositionEnv } from '../workspace-integration'
import { Workspace as ReviewWorkspace } from './workspace-review-entry.test-support'

export { default } from './workspace-review-entry.test-support'

export class Workspace extends ReviewWorkspace {
  private readonly pendingWork: Promise<unknown>[]
  private readonly recoveryClock: { now: number }
  private advanceRuns = 0
  private lifecycleRuns = 0
  private advancedLifecycleRuns = 0
  private registrationGate: ReturnType<typeof heldOperation> | undefined

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

  async recoveryChangedAlarmAt(): Promise<number | null> {
    return (
      (await this.ctx.storage.get<number>('alarm:lifecycle:changed')) ?? null
    )
  }

  setRecoveryTime(at: number): void {
    this.recoveryClock.now = at
  }

  holdTurnRegistration(): void {
    const gate = heldOperation()
    this.registrationGate = gate
    const register = this.controller.registerLifecycleTurn.bind(this.controller)
    this.controller.registerLifecycleTurn = async (...input) => {
      await register(...input)
      if (this.registrationGate === gate) await gate.wait()
    }
  }

  async turnRegistrationEntered(): Promise<void> {
    if (!this.registrationGate) throw new Error('No held turn registration.')
    await this.registrationGate.entered
  }

  releaseTurnRegistration(): void {
    this.registrationGate?.release()
    this.registrationGate = undefined
  }

  async repeatLifecycleWrite() {
    try {
      await this.lifecycleStep('runner', 'Starting the agent', 'completed')
      return { ok: true as const }
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : String(error),
      }
    }
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
