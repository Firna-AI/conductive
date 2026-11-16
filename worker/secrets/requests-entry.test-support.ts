import { createApp } from '../application'
import { Workspace as ProductionWorkspace } from '../workspace'
import type { WorkspaceCompositionEnv } from '../chat/workspace-integration'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { readOutputSnapshot } from '../chat/output-filter-records'
import { advanceScheduledAlarms } from '../lifecycle/scheduled-alarms.test-support'
import type { MessageSender } from '../../src/shared/generated/MessageSender'

const CLOCK_KEY = '__test:secret-clock'

export class Workspace extends ProductionWorkspace {
  private readonly secretClock: { now: number }
  constructor(context: DurableObjectState, env: WorkspaceCompositionEnv) {
    const clock = { now: DEVICE_TEST_NOW }
    super(
      context,
      {
        ...env,
        CONDUCTIVE_MODELS: JSON.stringify([
          {
            agent: 'claude',
            model: 'test-claude',
            label: 'Test model',
            efforts: ['high'],
          },
        ]),
      },
      () => clock.now,
    )
    this.secretClock = clock
    context.blockConcurrencyWhile(async () => {
      clock.now =
        (await context.storage.get<number>(CLOCK_KEY)) ?? DEVICE_TEST_NOW
    })
  }

  async advanceSecretClock(at: number) {
    this.secretClock.now = at
    await this.ctx.storage.put(CLOCK_KEY, at)
    await this.integration.secrets.reconcile()
  }

  readStartAlarm() {
    return this.ctx.storage.getAlarm()
  }

  async advanceStartAlarm(at?: number) {
    const scheduled = await this.readStartAlarm()
    await advanceScheduledAlarms(
      {
        now: () => this.secretClock.now,
        setTime: async (now) => {
          this.secretClock.now = now
          await this.ctx.storage.put(CLOCK_KEY, now)
        },
      },
      at ?? Math.max(this.secretClock.now, scheduled ?? this.secretClock.now),
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

  async saveLateAnswerBeforeNotice(id: string, member: MessageSender) {
    await this.chat.changeWorkspace(OUTER_WORKSPACE, async (view) => {
      const record = await view.secrets.request(id)
      if (!record) throw new Error('The secret request is missing.')
      await view.secrets.save({
        ...record,
        lateAnswer: true,
        request: {
          ...record.request,
          state: 'allowed',
          answeredBy: member,
          notice: null,
        },
      })
    })
  }

  async storedSecretState() {
    return JSON.stringify([...(await this.ctx.storage.list()).entries()])
  }

  secretTurn(turnId: string) {
    return this.chat.readWorkspace(OUTER_WORKSPACE, (view) => view.turn(turnId))
  }

  savedFilterState() {
    return this.chat.readWorkspace(OUTER_WORKSPACE, async (view) =>
      JSON.stringify(
        await Promise.all(
          [null, ...(await view.output.streams())].map((id) =>
            readOutputSnapshot(this.env, view, OUTER_WORKSPACE, id),
          ),
        ),
      ),
    )
  }

  async secretAlarm() {
    return this.ctx.storage.get<number>('alarm:secrets')
  }
}

/** @public Miniflare entry point. */
export default createApp({ now: () => DEVICE_TEST_NOW })
