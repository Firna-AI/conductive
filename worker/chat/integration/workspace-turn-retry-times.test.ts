import { afterEach, beforeAll, expect, it } from 'vitest'

import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import { outerWorkerBundle } from './outer-runtime.test-support'
import {
  FIRST_TURN_END,
  recoveryWorkspaceFixture,
  type RecoveryWorkspaceFixture,
} from './workspace-recovery.test-support'

let bundle: string
let fixture: RecoveryWorkspaceFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/workspace-recovery-entry.test-support.ts',
  )
})
afterEach(async () => {
  await (await fixture?.actor())?.releaseTurnRegistration()
  await fixture?.dispose()
  fixture = undefined
})

it.each([false, true])(
  'keeps the committed turn-end idle time when a pre-replay resend disconnects: %s',
  async (disconnect) => {
    const active = (fixture = await recoveryWorkspaceFixture(bundle))
    const actor = await active.actor()
    active.runner.socket.close()
    await active.runner.closed
    await actor.setRecoveryTime(DEVICE_TEST_NOW + 600_000)
    if (disconnect) await actor.holdTurnRegistration()
    let connection = await active.connect('outer-runner-stream')
    expect(connection.welcome).toMatchObject({
      type: 'welcome',
      confirmedThrough: 1,
    })
    if (disconnect) {
      await actor.turnRegistrationEntered()
      connection.runner.socket.close()
      await connection.runner.closed
      await actor.releaseTurnRegistration()
      expect(await actor.readLifecycle()).toMatchObject({
        lastActivityAt: DEVICE_TEST_NOW,
      })
      connection = await active.connect('outer-runner-stream')
    }
    expect(await connection.runner.inbox.next()).toMatchObject({
      type: 'turn',
      turnId: 'first-turn',
    })
    connection.runner.socket.send(
      JSON.stringify({
        type: 'event',
        streamId: 'outer-runner-stream',
        eventNumber: 2,
        occurredAt: DEVICE_TEST_NOW + 100,
        event: FIRST_TURN_END,
      }),
    )
    expect(await connection.runner.inbox.next()).toMatchObject({
      type: 'confirm',
      throughEventNumber: 2,
    })
    expect(await actor.readLifecycle()).toMatchObject({
      state: 'ready',
      lastActivityAt: DEVICE_TEST_NOW + 100,
      runningSessions: [],
    })
    await actor.advanceStartAlarm(DEVICE_TEST_NOW + 1_800_099)
    expect(active.boat.stopIds).toEqual([])
    await actor.advanceStartAlarm(DEVICE_TEST_NOW + 1_800_100)
    expect(active.boat.stopIds).toEqual(['bx_lifecycle'])
    expect(await actor.readLifecycle()).toMatchObject({
      state: 'stopped',
      stoppedAt: DEVICE_TEST_NOW + 1_800_100,
    })
  },
)
