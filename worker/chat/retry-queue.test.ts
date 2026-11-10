import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { checkRetryBoundaries } from './retry-boundaries.test-support'
import {
  retryRequest,
  retryUnavailable,
  sessionRecord,
} from './retry.test-support'
import {
  lifecycleSnapshot,
  messageCommands,
  startTurn,
  terminalEvent,
} from './turn-lifecycle.test-support'
describe('retry eligibility and queued work', () => {
  let harness: TestHarness
  beforeAll(async () => {
    harness = await createHarness()
  })
  beforeEach(async () => {
    await harness.reset()
  })
  afterAll(async () => {
    await harness.dispose()
  })
  it('does not make an older failure retryable after queued or stopped waiting work', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const active = await startTurn(fixture, runner, session.id, 'first')
    await fixture.fetch(
      sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
      { turnId: active.turnId },
    )
    await fixture.send(session.id, 'waiting', fixture.memberCookie)
    await fixture.setSendRule({
      type: 'turn',
      error: 'Hold the next turn queued',
      messageId: 'waiting',
    })
    runner.emit(terminalEvent(active, 'failed'))
    await fixture.drain()
    const before = await lifecycleSnapshot(fixture)
    const conflict = await retryRequest(fixture, session.id, 'first')
    expect(conflict.status).toBe(409)
    expect(await conflict.json()).toEqual(retryUnavailable)
    expect(await lifecycleSnapshot(fixture)).toEqual(before)
    expect(before.sessions[0]?.retryMessageId).toBeNull()
    expect(before.turns.map((turn) => turn.state)).toEqual(['failed', 'queued'])
    expect(messageCommands(runner, 'waiting')).toEqual([])
    await fixture.setSendRule(null)
    await fixture.restart()
    await fixture.connect(runner)
    expect(messageCommands(runner, 'waiting')).toMatchObject([
      { type: 'turn', message: { sender: { id: fixture.member.id } } },
    ])
    expect((await sessionRecord(fixture, session.id)).retryMessageId).toBeNull()
    const other = await fixture.createSession()
    const older = await startTurn(fixture, runner, other.id, 'older')
    await fixture.fetch(
      sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, other.id),
      { turnId: older.turnId },
    )
    await fixture.send(other.id, 'cancelled')
    const cancelledId = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.messageTurn('cancelled'),
    )
    const stopped = await fixture.fetch(
      sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, other.id),
      { turnId: cancelledId },
    )
    expect(await stopped.json()).toEqual({
      eventNumber: 22,
      turnId: cancelledId,
      state: 'stopped',
    })
    runner.disconnect()
    await fixture.restart()
    await fixture.connect(runner)
    runner.emit(terminalEvent(older, 'failed'))
    await fixture.drain()
    const stale = await retryRequest(fixture, other.id, 'older')
    expect(stale.status).toBe(409)
    expect(await stale.json()).toEqual(retryUnavailable)
    expect((await sessionRecord(fixture, other.id)).retryMessageId).toBeNull()
    expect(messageCommands(runner, 'cancelled')).toEqual([])
  })
  it('commits retry eligibility with a failed turn at both commit boundaries', async () => {
    await checkRetryBoundaries(harness, 'failure')
  })
  it('commits retry eligibility with an accepted retry at both commit boundaries', async () => {
    await checkRetryBoundaries(harness, 'retry')
  })
})
