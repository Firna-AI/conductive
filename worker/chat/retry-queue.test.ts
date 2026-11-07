import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  liveSessions,
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
    fixture.transport.dropOutgoing = (message) => {
      if (message.type === 'turn' && message.message.id === 'waiting')
        throw new Error('Hold the next turn queued')
      return false
    }
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
    fixture.transport.dropOutgoing = () => false
    fixture.restart()
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
      turnId: cancelledId,
      state: 'stopped',
    })
    runner.disconnect()
    fixture.restart()
    await fixture.connect(runner)
    runner.emit(terminalEvent(older, 'failed'))
    await fixture.drain()
    const stale = await retryRequest(fixture, other.id, 'older')
    expect(stale.status).toBe(409)
    expect(await stale.json()).toEqual(retryUnavailable)
    expect((await sessionRecord(fixture, other.id)).retryMessageId).toBeNull()
    expect(messageCommands(runner, 'cancelled')).toEqual([])
  })

  it('commits retry eligibility with the failure and the accepted retry', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const active = await startTurn(fixture, runner, session.id, 'atomic')
    const tab = await fixture.tab()
    const before = await lifecycleSnapshot(fixture)
    fixture.storage.failCommit = true
    runner.emit(terminalEvent(active, 'failed'))
    await expect(fixture.drain()).rejects.toThrow('Injected storage failure')
    expect(await lifecycleSnapshot(fixture)).toEqual(before)
    expect(liveSessions(tab.messages)).toEqual([])
    fixture.storage.failCommit = false
    await fixture.connect(runner)
    expect((await sessionRecord(fixture, session.id)).retryMessageId).toBe(
      'atomic',
    )
    expect(
      liveSessions(tab.messages).map((record) => record.retryMessageId),
    ).toEqual(['atomic'])
    const failed = await lifecycleSnapshot(fixture)
    const failedHistory = await fixture.history(session.id)
    fixture.storage.failCommit = true
    const refused = await retryRequest(fixture, session.id, 'atomic')
    expect(refused.status).toBe(500)
    expect(await refused.json()).toEqual({
      error: {
        code: 'internal_error',
        message: 'The request failed. Try again.',
      },
    })
    expect(await lifecycleSnapshot(fixture)).toEqual(failed)
    expect(
      liveSessions(tab.messages).map((record) => record.retryMessageId),
    ).toEqual(['atomic'])
    fixture.storage.failCommit = false
    expect(await fixture.history(session.id)).toEqual(failedHistory)
    fixture.restart()
    const resumedTab = await fixture.tab()
    const accepted = await retryRequest(fixture, session.id, 'atomic')
    expect(accepted.status).toBe(202)
    const stored = await sessionRecord(fixture, session.id)
    expect(stored.retryMessageId).toBeNull()
    expect(
      liveSessions(resumedTab.messages).map((record) => record.retryMessageId),
    ).toEqual([null])
    expect(
      (await fixture.history(session.id)).events.filter(
        ({ event }) => event.type === 'message.accepted',
      ),
    ).toHaveLength(2)
    tab.close()
    resumedTab.close()
  })
})
