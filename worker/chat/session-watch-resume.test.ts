import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { CLAUDE, WORKSPACE_ID } from './harness.test-support'
import { watchFixture, type WatchFixture } from './session-watch.test-support'
import { messageCommands, terminalEvent } from './turn-lifecycle.test-support'

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

it('keeps accepted notice work after a failed first start and waits for Try again', async () => {
  await f.finishCaller()
  await f.actor.lifecycle.initializeLifecycle({
    workspaceId: WORKSPACE_ID,
    orgId: f.org.id,
    firstMessage: {
      id: 'calling-message',
      text: 'Check this code',
      choice: CLAUDE,
      attachmentIds: [],
    },
    firstTurn: {
      turnId: f.calling.turnId,
      sessionId: f.source.id,
      senderUserId: f.owner.id,
    },
  })
  await f.actor.lifecycle.beginLifecycleStart('create')
  await f.actor.lifecycle.lifecycleStep(
    'machine',
    'Starting the cloud computer',
    'running',
  )
  await f.actor.lifecycle.lifecycleFailed({
    code: 'workspace_start_failed',
    message: 'The first start failed.',
    log: null,
  })
  await f.fire()
  expect(await f.receipt()).toMatchObject({
    state: 'accepted',
    resume: 'waiting',
  })
  expect(await f.actor.lifecycle.readLifecycle()).toMatchObject({
    state: 'error',
    start: { kind: 'create' },
  })
  expect((await f.actor.api.lifecycleControls.checkpoint()).job).toBe(undefined)
  expect(await f.notices()).toHaveLength(1)
})

it('retries the notice current message mapping after continuation moves it', async () => {
  await f.finishTarget('finished')
  const ready = await f.ready()
  await f.disconnect(f.runner)
  expect(await f.actor.rpc.acceptSessionWatch(ready)).toBe('accepted')
  await f.actor.api.controls.drainBackground()
  const [notice] = await f.notices()
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    const receipt = await view.watches.receipt(f.watch.watchId)
    if (receipt?.state !== 'accepted')
      throw new Error('The notice receipt is missing.')
    await view.watches.saveReceipt({ ...receipt, resume: 'pending' })
  })
  await f.connect(f.runner)
  f.runner.emit(terminalEvent(f.calling, 'finished'))
  await f.drain()
  const current = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.messageTurn(notice.messageId),
  )
  expect(current).not.toBe(notice.turnId)
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) => view.turn(current ?? '')),
  ).toMatchObject({
    sessionId: f.source.id,
    state: 'running',
    messageIds: [notice.messageId],
  })
  await f.disconnect(f.runner)
  await f.restart()
  await f.env.DB.prepare("UPDATE workspaces SET state = 'ready' WHERE id = ?")
    .bind(WORKSPACE_ID)
    .run()
  await f.clock.advance(30_000)
  await f.fire()
  expect(await f.receipt()).toMatchObject({
    state: 'accepted',
    resume: 'waiting',
  })
  expect(await f.notices()).toHaveLength(1)
})

it('cancels accepted resume retry after a later Stop without removing its durable line', async () => {
  await f.finishCaller()
  await f.finishTarget('finished')
  const ready = await f.ready()
  await f.disconnect(f.runner)
  expect(await f.actor.rpc.acceptSessionWatch(ready)).toBe('accepted')
  await f.actor.api.controls.drainBackground()
  const [notice] = await f.notices()
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    const receipt = await view.watches.receipt(f.watch.watchId)
    if (receipt?.state !== 'accepted')
      throw new Error('The notice receipt is missing.')
    await view.watches.saveReceipt({ ...receipt, resume: 'pending' })
  })
  await f.stop(f.source.id, notice.turnId)
  await f.clock.advance(30_000)
  await f.fire()
  expect(await f.receipt()).toMatchObject({
    state: 'accepted',
    resume: 'cancelled',
  })
  expect(await f.notices()).toHaveLength(1)
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) => view.session(f.source.id)),
  ).toMatchObject({ activeTurnId: null })
})

it('keeps a pending wake out of continuation after Stop while ordinary messages continue', async () => {
  await f.finishTarget('finished')
  const ready = await f.ready()
  await f.disconnect(f.runner)
  expect(await f.actor.rpc.acceptSessionWatch(ready)).toBe('accepted')
  await f.actor.api.controls.drainBackground()
  const [notice] = await f.notices()
  await f.send(f.source.id, 'ordinary-pending-message')
  await f.stop()
  await f.connect(f.runner)
  f.runner.emit(terminalEvent(f.calling, 'finished'))
  await f.drain()
  expect(messageCommands(f.runner, notice.messageId)).toEqual([])
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.messageTurn(notice.messageId),
    ),
  ).toBe(f.calling.turnId)
  const ordinary = messageCommands(f.runner, 'ordinary-pending-message')
  expect(ordinary).toMatchObject([
    { type: 'turn', message: { id: 'ordinary-pending-message' } },
  ])
  expect(ordinary[0]?.turnId).not.toBe(f.calling.turnId)
  await f.clock.advance(30_000)
  await f.fire()
  expect(await f.receipt()).toMatchObject({
    state: 'accepted',
    resume: 'cancelled',
  })
  expect(await f.notices()).toHaveLength(1)
})
