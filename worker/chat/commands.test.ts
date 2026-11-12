import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type {
  ChangeModelResponse,
  SessionResponse,
  SessionsResponse,
} from '../../src/shared/sessions'
import { sessionPaths, sessionsPath } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  CLAUDE,
  CODEX,
  createChatFixture,
  WORKSPACE_ID,
} from './harness.test-support'
describe('workspace chat commands', () => {
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
  it('keeps same-agent model changes and moves the unchanged draft to a new agent session', async () => {
    const ids = ['z-session', 'model-command']
    const fixture = await createChatFixture(harness, {
      ids,
      idFallback: 'later-command',
    })
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const draft = {
      text: '  Keep this draft.\n',
      attachmentIds: ['attachment-a'],
    }
    const nextChoice = { ...CLAUDE, model: 'another-model', effort: 'max' }
    const sameResponse = await fixture.fetch(
      sessionPaths.model(fixture.org.id, WORKSPACE_ID, session.id),
      { choice: nextChoice, draft, newSessionId: 'a-session' },
      fixture.ownerCookie,
      'PUT',
    )
    const same: ChangeModelResponse = await sameResponse.json()
    expect(same).toEqual({
      eventNumber: 2,
      session: { ...session, choice: nextChoice },
      created: false,
      draft,
    })
    expect(runner.commands[0]).toMatchObject({
      type: 'model',
      sessionId: session.id,
      choice: nextChoice,
    })
    const changedModel = runner.commands[0]
    runner.disconnect()
    await fixture.connect(runner)
    expect(runner.commands[1]).toEqual(changedModel)
    await fixture.clock.advance(1000)
    const changedResponse = await fixture.fetch(
      sessionPaths.model(fixture.org.id, WORKSPACE_ID, session.id),
      { choice: CODEX, draft, newSessionId: 'a-session' },
      fixture.ownerCookie,
      'PUT',
    )
    const changed: ChangeModelResponse = await changedResponse.json()
    expect(changed.created).toBe(true)
    expect(changed.session.id).toBe('a-session')
    expect(changed.session.id).not.toBe(session.id)
    expect(changed.session.choice).toEqual(CODEX)
    expect(changed.session.createdAt).toBe(session.createdAt + 1000)
    expect(changed.draft).toEqual(draft)
    const invalid = await fixture.fetch(
      sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
      { id: 'bad-agent', text: 'Hello', attachmentIds: [], choice: CODEX },
    )
    expect(invalid.status).toBe(409)
    const sessions: SessionsResponse = await (
      await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
    ).json()
    expect(sessions.sessions.map((entry) => entry.id)).toEqual([
      'z-session',
      'a-session',
    ])
    expect(sessions.sessions.map((entry) => entry.choice.agent)).toEqual([
      'claude',
      'codex',
    ])
    expect(changed.session.title).toBeNull()
    const accepted = await fixture.send(
      changed.session.id,
      'other-agent-message',
      fixture.ownerCookie,
      CODEX,
      'Title the other agent session.',
    )
    expect(accepted.session.title).toBe('Title the other agent session')
  })
  it('stops a running session before closing and reopens its stored history', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await fixture.send(session.id)
    const initial = runner.commands[0]
    if (initial?.type !== 'turn') throw new Error('Expected a turn.')
    const closePath = sessionPaths.close(
      fixture.org.id,
      WORKSPACE_ID,
      session.id,
    )
    expect(
      (await fixture.fetch(closePath, { stopRunningTurn: false })).status,
    ).toBe(409)
    const waiting: SessionResponse = await (
      await fixture.fetch(closePath, { stopRunningTurn: true })
    ).json()
    expect(waiting.session.closedAt).toBeNull()
    expect(runner.commands[1]).toMatchObject({
      type: 'interrupt',
      sessionId: session.id,
      turnId: initial.turnId,
    })
    runner.emit({
      type: 'turn.completed',
      sessionId: session.id,
      turnId: initial.turnId,
      state: 'stopped',
      durationMs: 20,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    })
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
    expect(history.events.map(({ event }) => event.type)).toContain(
      'turn.completed',
    )
    expect(history.events.map(({ event }) => event.type)).not.toContain(
      'turn.failed',
    )
    await fixture.fetch(
      sessionPaths.reopen(fixture.org.id, WORKSPACE_ID, session.id),
      {},
    )
    await fixture.send(session.id, 'continued')
    expect(runner.commands[2]).toMatchObject({
      type: 'turn',
      sessionId: session.id,
    })
    const continued = runner.commands[2]
    if (continued?.type !== 'turn')
      throw new Error('Expected a continued turn.')
    const stopped = await fixture.fetch(
      sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
      { turnId: continued.turnId },
    )
    expect(await stopped.json()).toEqual({
      eventNumber: 12,
      turnId: continued.turnId,
      state: 'stopping',
    })
    expect(runner.commands[3]).toMatchObject({
      type: 'interrupt',
      turnId: continued.turnId,
    })
  })
})
