import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { lifecycleSnapshot } from './turn-lifecycle.test-support'

describe('runner events for turns that never started', () => {
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

  it('refuses queued and stopped queued packets without ending or dispatching queued work', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    await fixture.send(session.id, 'queued-message')
    const [queued] = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.turns(),
    )
    if (!queued) throw new Error('The queued turn is missing.')
    const runner = await fixture.connect()
    const before = await lifecycleSnapshot(fixture)
    runner.emit({
      type: 'turn.started',
      sessionId: session.id,
      turnId: queued.id,
      senderId: fixture.owner.id,
      choice: CLAUDE,
      startedAt: TEST_TIME,
      messageIds: ['queued-message'],
    })
    const terminal = {
      type: 'turn.completed' as const,
      sessionId: session.id,
      turnId: queued.id,
      state: 'finished' as const,
      durationMs: 25,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['queued-message'],
    }
    runner.emit(terminal)
    await fixture.drain()
    expect(await lifecycleSnapshot(fixture)).toEqual(before)
    const response = await fixture.fetch(
      sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
      { turnId: queued.id },
    )
    expect(await response.json()).toEqual({
      eventNumber: 8,
      turnId: queued.id,
      state: 'stopped',
    })
    const stopped = await lifecycleSnapshot(fixture)
    expect(stopped.turns[0]).toMatchObject({ state: 'stopped', started: false })
    runner.emit({
      type: 'assistant.delta',
      sessionId: session.id,
      turnId: queued.id,
      messageId: 'not-an-answer',
      text: 'This turn never reached the runner.',
    })
    runner.emit(terminal)
    await fixture.drain()
    expect(await lifecycleSnapshot(fixture)).toEqual(stopped)
    expect(
      (await fixture.history(session.id)).events
        .map(({ event }) => event)
        .filter((event) => event.type === 'runner.event-refused')
        .map((event) => event.reason),
    ).toEqual([
      'turn_not_active',
      'turn_not_active',
      'turn_not_active',
      'turn_not_active',
    ])
    expect(runner.commands).toEqual([])
    expect(runner.pendingEvents()).toEqual([])
  })

  it('ends a trusted queued login failure but refuses later runner data for that turn', async () => {
    let loginAvailable = true
    const fixture = await createChatFixture(harness, {
      resolveLogin: async (_userId, agent) =>
        loginAvailable
          ? { agent, kind: 'api-key', secret: 'test-login' }
          : null,
    })
    const session = await fixture.createSession()
    await fixture.send(session.id, 'login-message')
    const [queued] = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.turns(),
    )
    if (!queued) throw new Error('The queued turn is missing.')
    loginAvailable = false
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const before = await lifecycleSnapshot(fixture)
    expect(
      (await fixture.history(session.id)).events
        .map(({ event }) => event)
        .filter((event) => event.type === 'turn.failed'),
    ).toEqual([
      {
        type: 'turn.failed',
        sessionId: session.id,
        turnId: queued.id,
        error: {
          code: 'agent_login_required',
          message:
            "Octocat's Claude login is not available. Try again or send a new message.",
        },
        retryMessageId: 'login-message',
        durationMs: 0,
      },
    ])
    expect(before.sessions[0]?.activeTurnId).toBeNull()
    expect(before.sessions[0]?.retryMessageId).toBe('login-message')
    expect(before.turns[0]).toMatchObject({ state: 'failed', started: false })
    runner.emit({
      type: 'assistant.delta',
      sessionId: session.id,
      turnId: queued.id,
      messageId: 'not-an-answer',
      text: 'This turn never got an agent login.',
    })
    runner.emit({
      type: 'turn.failed',
      sessionId: session.id,
      turnId: queued.id,
      error: { code: 'runner-failure', message: 'Not a dispatched turn.' },
      retryMessageId: 'login-message',
      durationMs: 25,
    })
    await fixture.drain()
    expect(await lifecycleSnapshot(fixture)).toEqual(before)
    expect(
      (await fixture.history(session.id)).events
        .map(({ event }) => event)
        .filter((event) => event.type === 'runner.event-refused')
        .map((event) => event.reason),
    ).toEqual(['turn_not_active', 'turn_not_active'])
    expect(runner.commands).toEqual([])
    expect(runner.pendingEvents()).toEqual([])
  })
})
