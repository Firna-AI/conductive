import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'

describe('workspace chat queue', () => {
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

  it('keeps queued messages across restart and retries opaque message IDs once', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const accepted = await fixture.send(session.id, '__proto__')
    expect(accepted.message.state).toBe('queued')
    expect(accepted.turnId).toBeNull()
    const beforeRetry = await fixture.history(session.id)
    expect(await fixture.send(session.id, '__proto__')).toEqual(accepted)
    expect(await fixture.history(session.id)).toEqual(beforeRetry)
    await fixture.send(session.id, 'constructor')
    fixture.restart()
    const runner = await fixture.connect()
    expect(runner.commands).toEqual([])
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    expect(runner.commands.map((command) => command.type)).toEqual([
      'turn',
      'message',
    ])
    const command = runner.commands[0]
    expect(command?.type).toBe('turn')
    if (command?.type !== 'turn') throw new Error('Expected a turn.')
    expect(command.message.sender.id).toBe(fixture.owner.id)
    expect(command.login).toEqual({
      agent: 'claude',
      kind: 'api-key',
      secret: `secret-${fixture.owner.id}-claude`,
    })
    const sent = await fixture.history(session.id)
    expect(
      sent.events.filter(({ event }) => event.type === 'message.accepted'),
    ).toHaveLength(2)
    expect(
      sent.events.filter(({ event }) => event.type === 'message.sent'),
    ).toHaveLength(2)
    expect(JSON.stringify([...fixture.storage.records.values()])).not.toContain(
      `secret-${fixture.owner.id}`,
    )
    runner.emit({
      type: 'turn.started',
      sessionId: session.id,
      turnId: command.turnId,
      senderId: fixture.owner.id,
      choice: CLAUDE,
      startedAt: 1_800_000_000_000,
      messageIds: ['__proto__', 'constructor'],
    })
    await fixture.drain()
    fixture.transport.dropOutgoing = (message) => {
      if (message.type === 'message')
        throw new Error('Injected socket send failure')
      return false
    }
    const dropped = await fixture.fetch(
      sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
      {
        id: 'socket-drop',
        text: 'Keep this accepted message',
        attachmentIds: [],
        choice: CLAUDE,
      },
    )
    expect(dropped.status).toBe(202)
    expect(await dropped.json()).toMatchObject({
      message: { id: 'socket-drop', state: 'queued' },
    })
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(command.turnId),
      ),
    ).toMatchObject({ state: 'running' })
    fixture.transport.dropOutgoing = () => false
    fixture.restart()
    await fixture.connect(runner)
    expect(runner.commands.at(-1)).toMatchObject({
      type: 'message',
      turnId: command.turnId,
      message: { id: 'socket-drop', state: 'sent' },
    })
  })

  it('uses each sender login during a turn and on the next turn', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await fixture.send(session.id)
    const initial = runner.commands[0]
    if (initial?.type !== 'turn') throw new Error('Expected a turn.')
    runner.emit({
      type: 'turn.started',
      sessionId: session.id,
      turnId: initial.turnId,
      senderId: fixture.owner.id,
      choice: CLAUDE,
      startedAt: 1_800_000_000_000,
      messageIds: ['message-1'],
    })
    await fixture.drain()
    await fixture.send(session.id, 'steer', fixture.memberCookie)
    const steer = runner.commands[1]
    expect(steer?.type).toBe('message')
    if (steer?.type !== 'message')
      throw new Error('Expected a message during the turn.')
    expect(steer.turnId).toBe(initial.turnId)
    expect(steer.message.sender.id).toBe(fixture.member.id)
    expect(steer.login).toEqual({
      agent: 'claude',
      kind: 'api-key',
      secret: `secret-${fixture.member.id}-claude`,
    })
    runner.emit({
      type: 'turn.completed',
      sessionId: session.id,
      turnId: initial.turnId,
      state: 'finished',
      durationMs: 10,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['message-1', 'steer'],
    })
    await fixture.drain()
    await fixture.send(session.id, 'next', fixture.memberCookie)
    const next = runner.commands[2]
    expect(next?.type).toBe('turn')
    if (next?.type !== 'turn') throw new Error('Expected the next turn.')
    expect(next.sessionId).toBe(session.id)
    expect(next.turnId).not.toBe(initial.turnId)
    expect(next.login.secret).toBe(`secret-${fixture.member.id}-claude`)
    expect(JSON.stringify(await fixture.history(session.id))).not.toContain(
      'secret-',
    )
  })
})
