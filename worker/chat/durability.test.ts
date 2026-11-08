import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { retryRequest, sessionRecord } from './retry.test-support'
import { terminalEvent } from './turn-lifecycle.test-support'

describe('workspace chat durability', () => {
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

  it('confirms and broadcasts only after an atomic commit', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await fixture.send(session.id)
    const command = runner.commands[0]
    if (command?.type !== 'turn') throw new Error('Expected a turn.')
    const tab = await fixture.tab()
    const confirmations = runner.received.length
    const entered = deferred()
    const release = deferred()
    fixture.storage.beforeCommit = async () => {
      entered.resolve()
      await release.promise
    }
    runner.emit({
      type: 'assistant.delta',
      sessionId: session.id,
      turnId: command.turnId,
      messageId: 'answer',
      text: 'Durable',
    })
    await entered.promise
    expect(runner.received).toHaveLength(confirmations)
    expect(tab.messages).toHaveLength(1)
    release.resolve()
    await fixture.drain()
    expect(runner.received.at(-1)).toEqual({
      type: 'confirm',
      streamId: 'fake-stream-1',
      throughEventNumber: 2,
    })
    expect(tab.messages.at(-1)).toMatchObject({
      type: 'event',
      envelope: { event: { type: 'assistant.delta', text: 'Durable' } },
    })
    fixture.storage.beforeCommit = null
    tab.close()
  })

  it('continues unanswered messages with their sender after a text-only turn', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await fixture.send(session.id)
    const initial = runner.commands[0]
    if (initial?.type !== 'turn') throw new Error('Expected a turn.')
    await fixture.send(session.id, 'waiting', fixture.memberCookie)
    runner.emit({
      type: 'turn.completed',
      sessionId: session.id,
      turnId: initial.turnId,
      state: 'finished',
      durationMs: 10,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    })
    await fixture.drain()
    expect(runner.commands.map((command) => command.type)).toEqual([
      'turn',
      'message',
      'turn',
    ])
    const next = runner.commands[2]
    if (next?.type !== 'turn') throw new Error('Expected a continuation turn.')
    expect(next.turnId).not.toBe(initial.turnId)
    expect(next.message.id).toBe('waiting')
    expect(next.login.secret).toBe(`secret-${fixture.owner.id}-claude`)
    expect(next.message.sender.id).toBe(fixture.member.id)
    runner.emit(terminalEvent(next, 'failed'))
    await fixture.drain()
    expect((await sessionRecord(fixture, session.id)).retryMessageId).toBe(
      'waiting',
    )
    expect((await retryRequest(fixture, session.id, 'waiting')).status).toBe(
      202,
    )
  })

  it('does not dispatch stale commands after a queued login fails', async () => {
    const fixture = await createChatFixture(harness)
    const first = await fixture.createSession()
    const second = await fixture.createSession(CLAUDE, fixture.memberCookie)
    await fixture.send(first.id)
    await fixture.send(first.id, 'old-snapshot', fixture.memberCookie)
    await fixture.send(second.id, 'separate-turn', fixture.memberCookie)
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.owner.id)
      .run()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    expect(
      runner.commands.map((command) => ({
        type: command.type,
        sessionId: 'sessionId' in command ? command.sessionId : null,
      })),
    ).toEqual([{ type: 'turn', sessionId: second.id }])
    expect(
      (await fixture.history(first.id)).events.filter(
        ({ event }) => event.type === 'turn.failed',
      ),
    ).toHaveLength(1)
    const running = runner.commands[0]
    if (running?.type !== 'turn')
      throw new Error('Expected the independent turn.')
    runner.emit({
      type: 'turn.started',
      sessionId: second.id,
      turnId: running.turnId,
      senderId: fixture.member.id,
      choice: CLAUDE,
      startedAt: 1_800_000_000_000,
      messageIds: ['separate-turn'],
    })
    await fixture.drain()
    runner.disconnect()
    await fixture.send(second.id, 'removed-login-steer', fixture.memberCookie)
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.member.id)
      .run()
    await fixture.connect(runner)
    expect(
      (await fixture.history(second.id)).events.filter(
        ({ event }) => event.type === 'turn.failed',
      ),
    ).toHaveLength(0)
    expect(runner.commands).toHaveLength(1)
    runner.emit({
      type: 'assistant.delta',
      sessionId: second.id,
      turnId: running.turnId,
      messageId: 'live-answer',
      text: 'The original turn still runs.',
    })
    runner.emit({
      type: 'turn.completed',
      sessionId: second.id,
      turnId: running.turnId,
      state: 'finished',
      durationMs: 10,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['separate-turn'],
    })
    runner.emit({ type: 'workspace.title', name: 'The stream still works' })
    await fixture.drain()
    const later = await fixture.history(second.id)
    expect(later.events.map(({ event }) => event)).toContainEqual({
      type: 'assistant.delta',
      sessionId: second.id,
      turnId: running.turnId,
      messageId: 'live-answer',
      text: 'The original turn still runs.',
    })
    const failures = later.events
      .map(({ event }) => event)
      .filter((event) => event.type === 'turn.failed')
    expect(failures).toHaveLength(1)
    expect(failures[0]?.turnId).not.toBe(running.turnId)
    expect(runner.pendingEvents()).toEqual([])
    expect(
      (
        await fixture.chat.store.read(WORKSPACE_ID, (view) => view.history(0))
      ).events.at(-1)?.event,
    ).toEqual({ type: 'workspace.title', name: 'The stream still works' })
  })
})

function deferred() {
  let resolve: () => void = () => {
    throw new Error('The deferred promise is not ready.')
  }
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { resolve, promise }
}
