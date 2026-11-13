import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  sessionPaths,
  sessionsPath,
  type SessionsResponse,
} from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  messageCommands,
  startTurn,
  terminalEvent,
} from './turn-lifecycle.test-support'
describe('closing a session with waiting work', () => {
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
  it('stops waiting turns without ending the active turn and closes all waiting work in history', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const active = await startTurn(fixture, runner, session.id, 'first')
    await fixture.send(session.id, 'unanswered', fixture.memberCookie)
    const interruptPath = sessionPaths.interrupt(
      fixture.org.id,
      WORKSPACE_ID,
      session.id,
    )
    await fixture.fetch(interruptPath, { turnId: active.turnId })
    await fixture.send(session.id, 'cancel-one', fixture.memberCookie)
    const waitingId = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.messageTurn('cancel-one'),
    )
    expect(waitingId).not.toBe(active.turnId)
    const cancelled = await fixture.fetch(interruptPath, { turnId: waitingId })
    expect(await cancelled.json()).toEqual({
      eventNumber: 15,
      turnId: waitingId,
      state: 'stopped',
    })
    const during: SessionsResponse = await (
      await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
    ).json()
    expect(during.sessions[0]?.activeTurnId).toBe(active.turnId)
    await fixture.send(session.id, 'close-waiting', fixture.memberCookie)
    await fixture.fetch(
      sessionPaths.close(fixture.org.id, WORKSPACE_ID, session.id),
      { stopRunningTurn: true },
    )
    await fixture.send(session.id, 'close-window')
    expect(messageCommands(runner, 'close-waiting')).toEqual([])
    runner.emit(terminalEvent(active, 'finished'))
    await fixture.drain()
    const closed: SessionsResponse = await (
      await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
    ).json()
    expect(closed.sessions).toEqual([])
    expect(closed.history).toEqual([
      {
        ...session,
        title: 'Check this code',
        activeTurnId: null,
        closedAt: 1_800_000_000_000,
      },
    ])
    const history = await fixture.history(session.id)
    const stopped = history.events
      .map(({ event }) => event)
      .filter((event) => event.type === 'turn.completed')
      .filter((event) => event.state === 'stopped')
    expect(stopped.map((event) => event.userMessageIds)).toEqual([
      ['cancel-one'],
      ['close-waiting', 'close-window'],
    ])
    expect(
      messageCommands(runner, 'unanswered').map((command) => command.type),
    ).toEqual(['message'])
    runner.disconnect()
    await fixture.restart()
    await fixture.connect(runner)
    await fixture.fetch(
      sessionPaths.reopen(fixture.org.id, WORKSPACE_ID, session.id),
      {},
    )
    expect(messageCommands(runner, 'cancel-one')).toEqual([])
    expect(messageCommands(runner, 'close-waiting')).toEqual([])
    expect(messageCommands(runner, 'close-window')).toEqual([])
    await fixture.send(session.id, 'after-reopen', fixture.memberCookie)
    expect(messageCommands(runner, 'after-reopen')).toMatchObject([
      {
        type: 'turn',
        sessionId: session.id,
        message: { sender: { id: fixture.member.id } },
      },
    ])
  })
})
