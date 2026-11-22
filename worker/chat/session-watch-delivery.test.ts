import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionLink } from '../../src/shared/session-link'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { watchFixture, type WatchFixture } from './session-watch.test-support'
import {
  messageCommands,
  startTurn,
  terminalEvent,
} from './turn-lifecycle.test-support'

let harness: TestHarness
let f: WatchFixture
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
beforeEach(async () => {
  f = await watchFixture(harness, true)
})
afterAll(async () => {
  await harness.dispose()
})

it.each(['finished', 'failed', 'stopped'] as const)(
  'wakes once for %s and returns ended exact turns without another watch',
  async (state) => {
    await f.finishCaller()
    const envelope = await f.finishTarget(state)
    await f.fire()
    const notices = await f.notices()
    expect(notices).toHaveLength(1)
    expect(notices[0]).toMatchObject({
      watchId: f.watch.watchId,
      state,
      reason: null,
      watchedTurnId: f.watched.turnId,
    })
    const notice = notices[0]
    const message = await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.message(notice.messageId),
    )
    expect(message).toMatchObject({
      sender: { id: f.member.id },
      text: `A turn ${state} in ${sessionLink(f.env.APP_ORIGIN, f.org.id, WORKSPACE_ID, f.target.id)}`,
    })
    expect(messageCommands(f.runner, notice.messageId)).toHaveLength(1)
    expect(
      (await f.history(f.source.id)).events.filter(
        ({ event }) =>
          event.type === 'message.accepted' &&
          event.message.id === notice.messageId,
      ),
    ).toEqual([])
    f.runner.sendEnvelope(envelope)
    await f.drain()
    await f.fire()
    expect(await f.notices()).toEqual(notices)
    expect(await f.register()).toMatchObject({
      state,
      turnId: f.watched.turnId,
    })
    expect(
      await f.chat.store.read(WORKSPACE_ID, (view) => view.watches.targets()),
    ).toHaveLength(1)
  },
)

it('keeps the safe end reason and uses the running caller sender under the fixed login rule', async () => {
  await f.finishCaller()
  const busy = await startTurn(f, f.runner, f.source.id, 'owner-busy-message')
  await f.env.DB.prepare(
    'UPDATE agent_logins SET no_reuse = 1 WHERE user_id = ?',
  )
    .bind(f.owner.id)
    .run()
  const end = terminalEvent(f.watched, 'finished')
  if (end.type !== 'turn.completed') throw new Error('Expected a completion.')
  f.runner.emit({ ...end, endReason: 'background_work_limit' })
  await f.drain()
  await f.fire()
  const [notice] = await f.notices()
  expect(notice).toMatchObject({
    reason: 'background_work_limit',
    turnId: busy.turnId,
  })
  expect(messageCommands(f.runner, notice.messageId)).toMatchObject([
    {
      type: 'message',
      turnId: busy.turnId,
      message: {
        sender: { id: f.owner.id },
        text: `A turn finished in ${sessionLink(f.env.APP_ORIGIN, f.org.id, WORKSPACE_ID, f.target.id)} · Background work stopped at the time limit`,
      },
    },
  ])
})

it('reports normalized login failure instead of the raw stopped runner result', async () => {
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    const turn = await view.turn(f.watched.turnId)
    if (!turn) throw new Error('The target turn is missing.')
    turn.loginFailure = 'Sensitive login failure stays in the target.'
    await view.saveTurn(turn)
  })
  const end = terminalEvent(f.watched, 'stopped')
  if (end.type !== 'turn.completed') throw new Error('Expected a completion.')
  f.runner.emit({ ...end, endReason: 'background_work_limit' })
  await f.drain()
  await f.fire()
  const [notice] = await f.notices()
  expect(notice).toMatchObject({ state: 'failed', reason: null })
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.message(notice.messageId),
    ),
  ).toMatchObject({
    text: `A turn failed in ${sessionLink(f.env.APP_ORIGIN, f.org.id, WORKSPACE_ID, f.target.id)}`,
  })
})
