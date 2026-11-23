import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { requireFeatureResult } from '../features/result'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { watchFixture, type WatchFixture } from './session-watch.test-support'
import { messageCommands, startTurn } from './turn-lifecycle.test-support'

let harness: TestHarness
let f: WatchFixture
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  f = await watchFixture(harness, true)
})
afterAll(async () => {
  await harness.dispose()
})

async function scheduleForAnotherMembersTurn() {
  const at = f.clock.now()
  const { wakeUp } = requireFeatureResult(
    await f.actor.rpc.scheduleAgentWakeUp(
      f.org.id,
      WORKSPACE_ID,
      f.calling.turnId,
      { at, text: 'Check the result' },
      at,
    ),
  )
  await f.finishCaller()
  const running = await startTurn(f, f.runner, f.source.id, 'owner-receiving')
  return { wakeUp, running }
}

function revokeMembership() {
  return f.env.DB.prepare(
    'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
  )
    .bind(f.org.id, f.member.id)
    .run()
}

async function outcomes() {
  return (await f.history(f.source.id)).events
    .map(({ event }) => event)
    .filter(
      (event) =>
        event.type === 'session.wake-up-fired' ||
        event.type === 'session.wake-up-ended',
    )
}

it.each([
  ['membership', 'sender-unavailable'],
  ['login sharing', 'login-not-shared'],
] as const)(
  'ends a scheduled wake-up when its setter loses %s and another member has a running turn',
  async (revoked, reason) => {
    const { wakeUp, running } = await scheduleForAnotherMembersTurn()
    if (revoked === 'membership') await revokeMembership()
    else {
      await f.env.DB.prepare(
        'UPDATE agent_logins SET no_reuse = 1 WHERE user_id = ? AND agent = ?',
      )
        .bind(f.owner.id, 'claude')
        .run()
    }

    await f.fire()
    expect(await outcomes()).toEqual([
      {
        type: 'session.wake-up-ended',
        sessionId: f.source.id,
        wakeUpId: wakeUp.id,
        at: wakeUp.at,
        outcome: { kind: 'could-not-start', reason: { kind: reason } },
      },
    ])
    expect(
      await f.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(running.turnId),
      ),
    ).toMatchObject({ state: 'running', messageIds: ['owner-receiving'] })
  },
)

it.each(['alarm', 'runner reconnect'])(
  'ends a scheduled wake-up on %s when its setter loses membership before handoff to another member’s turn',
  async (boundary) => {
    const { wakeUp, running } = await scheduleForAnotherMembersTurn()
    await f.env.DB.prepare("UPDATE workspaces SET state = 'ready' WHERE id = ?")
      .bind(WORKSPACE_ID)
      .run()
    await f.disconnect(f.runner)
    await f.clock.advance(5_000)
    await f.fire()
    const [fired] = await outcomes()
    if (fired?.type !== 'session.wake-up-fired')
      throw new Error('The fired notice is missing.')
    expect(fired.turnId).toBe(running.turnId)
    expect(
      await f.chat.store.read(WORKSPACE_ID, (view) => view.wakeUps.resumes()),
    ).toMatchObject([{ id: wakeUp.id, messageId: fired.messageId }])

    await revokeMembership()
    if (boundary === 'alarm') {
      await f.clock.advance(30_000)
      await f.fire()
      await f.connect(f.runner)
    } else await f.connect(f.runner)
    await f.drain()
    expect(await outcomes()).toEqual([
      fired,
      {
        type: 'session.wake-up-ended',
        sessionId: f.source.id,
        wakeUpId: wakeUp.id,
        at: wakeUp.at,
        outcome: {
          kind: 'could-not-start',
          reason: { kind: 'sender-unavailable' },
        },
      },
    ])
    expect(
      await f.chat.store.read(WORKSPACE_ID, (view) => view.wakeUps.resumes()),
    ).toEqual([])
    expect(messageCommands(f.runner, fired.messageId)).toEqual([])
    expect(
      await f.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(running.turnId),
      ),
    ).toMatchObject({ state: 'running', messageIds: ['owner-receiving'] })
  },
)
