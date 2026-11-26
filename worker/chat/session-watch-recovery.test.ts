import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import type { NativeCommitView } from '../test-support/native-commit'
import { WORKSPACE_ID } from './harness.test-support'
import { watchFixture, type WatchFixture } from './session-watch.test-support'
import { terminalEvent } from './turn-lifecycle.test-support'

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

it('recovers retained terminal facts after restart and reads past settled native storage pages', async () => {
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    const original = await view.watches.target(f.watch.watchId)
    const turn = await view.turn(f.watched.turnId)
    if (!original || !turn) throw new Error('The watch and turn are missing.')
    for (let index = 0; index < 66; index++) {
      await view.watches.saveTarget({
        ...original,
        id: `!settled-${index}`,
        stage: 'settled',
        outcome: 'accepted',
      })
      await view.watches.saveTarget({
        ...original,
        id: `!pending-${index}`,
        sessionId: f.source.id,
        turnId: f.calling.turnId,
        caller: {
          ...original.caller,
          workspaceId: `historical-caller-${index}`,
        },
        stage: 'pending',
      })
    }
    turn.state = 'finished'
    await view.saveTurn(turn)
    const end = terminalEvent(f.watched, 'finished')
    if (end.type !== 'turn.completed') throw new Error('Expected a completion.')
    await view.emit({ ...end, endReason: 'background_work_limit' })
  })
  await f.restart()
  await f.clock.advance(30_000)
  await f.fire()
  const [notice] = await f.notices()
  expect(notice).toMatchObject({
    state: 'finished',
    reason: 'background_work_limit',
    watchedTurnId: f.watched.turnId,
  })
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.watches.target(f.watch.watchId),
    ),
  ).toMatchObject({ stage: 'settled', outcome: 'accepted' })
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.turn(f.watched.turnId),
    ),
  ).toMatchObject({ endReason: 'background_work_limit' })
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.watches.activeTargets(),
    ),
  ).toHaveLength(66)
})

it.each(['beforeCommit', 'afterCommit'] as const)(
  'keeps one durable wake across a %s receipt failure',
  async (boundary) => {
    await f.finishCaller()
    await f.finishTarget('finished')
    let failed = false
    await f.setStorageHooks({
      [boundary]: async (commit: NativeCommitView) => {
        const receipt = await commit.read(WORKSPACE_ID, (view) =>
          view.watches.receipt(f.watch.watchId),
        )
        if (!failed && receipt?.state === 'accepted') {
          failed = true
          throw new Error(`Injected ${boundary} watch receipt failure`)
        }
      },
    })
    await f.fire()
    expect(failed).toBe(true)
    expect(await f.notices()).toHaveLength(boundary === 'beforeCommit' ? 0 : 1)
    expect(
      await f.chat.store.read(WORKSPACE_ID, (view) =>
        view.watches.target(f.watch.watchId),
      ),
    ).toMatchObject({ stage: 'ready' })
    await f.clearFaults()
    await f.restart()
    await f.clock.advance(30_000)
    await f.fire()
    expect(await f.notices()).toHaveLength(1)
    const receipt = await f.receipt()
    expect(receipt).toMatchObject({ state: 'accepted' })
    expect(
      await f.chat.store.read(WORKSPACE_ID, (view) =>
        view.watches.target(f.watch.watchId),
      ),
    ).toMatchObject({ stage: 'settled', outcome: 'accepted' })
    expect(
      (await f.chat.store.read(WORKSPACE_ID, (view) => view.turns())).filter(
        (turn) => turn.sessionId === f.source.id,
      ),
    ).toHaveLength(2)
  },
)

it('retains one suppressed receipt when a closed caller later reopens', async () => {
  await f.finishCaller()
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    const session = await view.session(f.source.id)
    if (!session) throw new Error('The caller session is missing.')
    session.closedAt = view.now
    await view.saveSession(session)
  })
  await f.finishTarget('failed')
  const ready = await f.ready()
  await f.fire()
  expect(await f.receipt()).toMatchObject({ state: 'suppressed' })
  expect(await f.notices()).toEqual([])
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    const session = await view.session(f.source.id)
    if (!session) throw new Error('The caller session is missing.')
    session.closedAt = null
    await view.saveSession(session)
  })
  expect(await f.actor.rpc.acceptSessionWatch(ready)).toBe('suppressed')
  expect(await f.notices()).toEqual([])
})
