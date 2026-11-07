import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  messageCommands,
  startTurn,
  terminalEvent,
} from './turn-lifecycle.test-support'

describe('messages after Stop', () => {
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

  it('keeps post-Stop messages queued until stopped, failed, and finished turns end', async () => {
    const fixture = await createChatFixture(harness)
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    for (const state of ['stopped', 'failed', 'finished'] as const) {
      const session = await fixture.createSession()
      const firstId = `first-${state}`
      const beforeId = `before-${state}`
      const afterId = `after-${state}`
      const laterId = `later-${state}`
      const active = await startTurn(fixture, runner, session.id, firstId)
      await fixture.send(session.id, beforeId, fixture.memberCookie)
      const stopped = await fixture.fetch(
        sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
        { turnId: active.turnId },
      )
      expect(await stopped.json(), state).toEqual({
        turnId: active.turnId,
        state: 'stopping',
      })
      const waiting = await fixture.send(
        session.id,
        afterId,
        fixture.memberCookie,
      )
      expect(waiting.turnId, state).toBeNull()
      expect(waiting.message.state, state).toBe('queued')
      await fixture.send(session.id, laterId)
      expect(messageCommands(runner, afterId), state).toEqual([])
      expect(messageCommands(runner, laterId), state).toEqual([])
      expect(
        await fixture.send(session.id, afterId, fixture.memberCookie),
        state,
      ).toEqual(waiting)
      const pending = await fixture.chat.store.read(
        WORKSPACE_ID,
        async (view) =>
          (await view.pending()).filter(
            (command) =>
              'messageId' in command &&
              [afterId, laterId].includes(command.messageId),
          ),
      )
      const independent = await fixture.createSession()
      await fixture.send(independent.id, `independent-${state}`)
      expect(
        messageCommands(runner, `independent-${state}`)[0],
        state,
      ).toMatchObject({ type: 'turn', sessionId: independent.id })
      runner.disconnect()
      fixture.restart()
      await fixture.connect(runner)
      expect(
        await fixture.send(session.id, afterId, fixture.memberCookie),
        state,
      ).toEqual(waiting)
      expect(
        await fixture.chat.store.read(WORKSPACE_ID, async (view) =>
          (await view.pending()).filter(
            (command) =>
              'messageId' in command &&
              [afterId, laterId].includes(command.messageId),
          ),
        ),
        state,
      ).toEqual(pending)
      expect(messageCommands(runner, afterId), state).toEqual([])
      runner.emit({
        type: 'assistant.delta',
        sessionId: session.id,
        turnId: active.turnId,
        messageId: `answer-${state}`,
        text: 'The old turn can still report output.',
      })
      runner.emit(terminalEvent(active, state))
      await fixture.drain()
      expect(messageCommands(runner, afterId), state).toHaveLength(
        state === 'finished' ? 0 : 1,
      )
      expect(
        messageCommands(runner, beforeId).map((command) => command.type),
        state,
      ).toEqual(state === 'finished' ? ['message', 'turn'] : ['message'])
      if (state === 'finished') {
        const continuation = messageCommands(runner, beforeId)[1]
        if (continuation?.type !== 'turn')
          throw new Error('The unanswered message did not get a turn.')
        runner.emit(terminalEvent(continuation, 'finished'))
        await fixture.drain()
      }
      const next = messageCommands(runner, afterId)
      expect(next, state).toHaveLength(1)
      expect(next[0], state).toMatchObject({
        type: 'turn',
        sessionId: session.id,
        message: { id: afterId, sender: { id: fixture.member.id } },
        login: { secret: `secret-${fixture.owner.id}-claude` },
      })
      expect(next[0]?.turnId, state).not.toBe(active.turnId)
      expect(messageCommands(runner, laterId), state).toMatchObject([
        {
          type: 'message',
          turnId: next[0]?.turnId,
          login: { secret: `secret-${fixture.owner.id}-claude` },
        },
      ])
      expect(
        (await fixture.history(session.id)).events.filter(
          ({ event }) =>
            event.type === 'message.accepted' && event.message.id === afterId,
        ),
        state,
      ).toHaveLength(1)
      expect(runner.pendingEvents(), state).toEqual([])
    }
  })

  it('advances waiting work when an earlier queued continuation cannot start', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const active = await startTurn(fixture, runner, session.id, 'first')
    await fixture.send(session.id, 'older-unanswered')
    await fixture.fetch(
      sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
      { turnId: active.turnId },
    )
    const waiting = await fixture.send(
      session.id,
      'after-stop',
      fixture.memberCookie,
    )
    expect(waiting.turnId).toBeNull()
    expect(messageCommands(runner, 'after-stop')).toEqual([])
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.owner.id)
      .run()
    runner.emit(terminalEvent(active, 'finished'))
    await fixture.drain()
    expect(
      messageCommands(runner, 'older-unanswered').map(
        (command) => command.type,
      ),
    ).toEqual(['message'])
    expect(messageCommands(runner, 'after-stop')).toEqual([])
    const failures = (await fixture.history(session.id)).events
      .map(({ event }) => event)
      .filter((event) => event.type === 'turn.failed')
    expect(failures).toHaveLength(2)
    expect(failures[0]?.retryMessageId).toBe('older-unanswered')
    expect(failures[1]?.retryMessageId).toBe('after-stop')
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.session(session.id),
      ),
    ).toMatchObject({ retryMessageId: 'after-stop', activeTurnId: null })
    expect(runner.pendingEvents()).toEqual([])
  })
})
