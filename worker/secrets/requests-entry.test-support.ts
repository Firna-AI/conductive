import { createApp } from '../application'
import { Workspace as ProductionWorkspace } from '../workspace'
import type { WorkspaceCompositionEnv } from '../chat/workspace-integration'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { readOutputSnapshot } from '../chat/output-filter-records'

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
