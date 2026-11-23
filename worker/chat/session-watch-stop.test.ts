import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { requireFeatureResult } from '../features/result'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { watchFixture, type WatchFixture } from './session-watch.test-support'
import { startTurn, terminalEvent } from './turn-lifecycle.test-support'

let harness: TestHarness
let f: WatchFixture
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
beforeEach(async () => {
  f = await watchFixture(harness)
})
afterAll(async () => {
  await harness.dispose()
})

it('coalesces later calling turns until explicit Stop and admits only fresh post-Stop intent', async () => {
  await f.finishCaller()
  const later = await startTurn(
    f,
    f.runner,
    f.source.id,
    'later-calling-message',
  )
  const beforeStop = await f.actor.rpc.callingWatchTurn(
    WORKSPACE_ID,
    later.turnId,
  )
  if (!beforeStop) throw new Error('The later calling turn is missing.')
  const input = {
    orgId: f.org.id,
    workspaceId: WORKSPACE_ID,
    sessionId: f.target.id,
    turnId: f.watched.turnId,
    caller: beforeStop,
  }
  expect(
    requireFeatureResult(await f.actor.rpc.watchAgentSession(input)),
  ).toEqual(f.watch)
  await f.stop(f.source.id, later.turnId)
  expect(await f.actor.rpc.callingWatchTurn(WORKSPACE_ID, later.turnId)).toBe(
    null,
  )
  f.runner.emit(terminalEvent(later, 'stopped'))
  await f.drain()
  const fresh = await startTurn(
    f,
    f.runner,
    f.source.id,
    'fresh-calling-message',
  )
  const afterStop = await f.actor.rpc.callingWatchTurn(
    WORKSPACE_ID,
    fresh.turnId,
  )
  if (!afterStop) throw new Error('The fresh calling turn is missing.')
  const newWatch = requireFeatureResult(
    await f.actor.rpc.watchAgentSession({ ...input, caller: afterStop }),
  )
  expect(newWatch.state).toBe('watching')
  if (newWatch.state !== 'watching')
    throw new Error('The fresh watch is missing.')
  expect(newWatch.watchId).not.toBe(f.watch.watchId)
  // An earlier request may reach the target after Stop. Its captured nonce must stay old.
  expect(
    requireFeatureResult(await f.actor.rpc.watchAgentSession(input)),
  ).toEqual(f.watch)
  await f.finishTarget('stopped')
  await f.fire()
  expect(await f.receipt()).toMatchObject({ state: 'suppressed' })
  expect((await f.notices()).map((notice) => notice.watchId)).toEqual([
    newWatch.watchId,
  ])
})

it('invalidates outgoing intent on idle tool Stop and keeps target Stop independent', async () => {
  await f.finishCaller()
  const stopped = requireFeatureResult(
    await f.actor.rpc.manageAgentSession(
      {
        kind: 'stop',
        orgId: f.org.id,
        workspaceId: WORKSPACE_ID,
        sessionId: f.source.id,
        callerWorkspaceId: WORKSPACE_ID,
        callerSessionId: f.target.id,
        senderUserId: f.owner.id,
      },
      f.env.APP_ORIGIN,
    ),
  )
  expect(stopped).toMatchObject({ state: 'idle', turnId: null })
  await f.stop(f.target.id, f.watched.turnId)
  await f.finishTarget('stopped')
  await f.fire()
  expect(await f.receipt()).toMatchObject({ state: 'suppressed' })
  expect(await f.notices()).toEqual([])
})

it('leaves a queued target pending on computer shutdown and wakes at its explicit queued Stop', async () => {
  await f.finishTarget('finished')
  await f.fire()
  await f.disconnect(f.runner)
  const queued = await f.send(f.target.id, 'queued-target')
  const turnId = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.messageTurn(queued.message.id),
  )
  if (!turnId) throw new Error('The queued turn is missing.')
  const watch = requireFeatureResult(
    await f.actor.rpc.watchAgentSession({
      orgId: f.org.id,
      workspaceId: WORKSPACE_ID,
      sessionId: f.target.id,
      turnId,
      caller: f.caller,
    }),
  )
  if (watch.state !== 'watching')
    throw new Error('The queued watch is missing.')
  await f.chat.stopWorkspace(WORKSPACE_ID)
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.watches.target(watch.watchId),
    ),
  ).toMatchObject({ stage: 'pending' })
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) => view.turn(turnId)),
  ).toMatchObject({ state: 'queued' })
  await f.stop(f.target.id, turnId)
  await f.fire()
  expect(
    (await f.notices()).filter((notice) => notice.watchId === watch.watchId),
  ).toMatchObject([{ state: 'stopped', watchedTurnId: turnId }])
})

it('ends watched waiting turns when Close cancels the target chain', async () => {
  await f.stop(f.target.id, f.watched.turnId)
  const waiting = await f.send(f.target.id, 'waiting-target')
  const turnId = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.messageTurn(waiting.message.id),
  )
  if (!turnId) throw new Error('The waiting turn is missing.')
  const watch = requireFeatureResult(
    await f.actor.rpc.watchAgentSession({
      orgId: f.org.id,
      workspaceId: WORKSPACE_ID,
      sessionId: f.target.id,
      turnId,
      caller: f.caller,
    }),
  )
  expect(
    (
      await f.fetch(sessionPaths.close(f.org.id, WORKSPACE_ID, f.target.id), {
        stopRunningTurn: true,
      })
    ).status,
  ).toBe(200)
  await f.finishTarget('stopped')
  await f.fire()
  expect(
    (await f.notices()).filter((notice) => notice.watchedTurnId === turnId),
  ).toMatchObject([{ state: 'stopped' }])
  expect(watch.state).toBe('watching')
})
