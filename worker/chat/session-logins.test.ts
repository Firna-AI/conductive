import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { sessionsPath } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { liveSessions } from './retry.test-support'
import { messageCommands } from './turn-lifecycle.test-support'

describe('session starter logins', () => {
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

  it('keeps the creator login when another member sends first and has no own login', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    expect(session.startedBy?.id).toBe(fixture.owner.id)
    expect(session.sourceSessionId).toBeNull()
    expect(session.loginAvailable).toBe(true)
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.member.id)
      .run()
    const ownerTab = await fixture.tab()
    const memberTab = await fixture.tab(0, undefined, fixture.memberCookie)
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const first = await fixture.send(session.id, 'first', fixture.memberCookie)
    expect(first.session.startedBy?.id).toBe(fixture.owner.id)
    const initial = messageCommands(runner, 'first')[0]
    if (initial?.type !== 'turn') throw new Error('The turn is missing.')
    expect(initial.message.sender.id).toBe(fixture.member.id)
    expect(initial.login.secret).toBe(`secret-${fixture.owner.id}-claude`)
    await fixture.send(session.id, 'steer', fixture.memberCookie)
    const steer = messageCommands(runner, 'steer')[0]
    expect(steer).toMatchObject({
      type: 'message',
      turnId: initial.turnId,
      login: { secret: `secret-${fixture.owner.id}-claude` },
      message: { sender: { id: fixture.member.id } },
    })
    runner.emit({
      type: 'turn.completed',
      sessionId: session.id,
      turnId: initial.turnId,
      state: 'finished',
      durationMs: 10,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['first', 'steer'],
    })
    await fixture.drain()
    await fixture.send(session.id, 'next', fixture.memberCookie)
    expect(messageCommands(runner, 'next')[0]).toMatchObject({
      type: 'turn',
      sessionId: session.id,
      login: { secret: `secret-${fixture.owner.id}-claude` },
    })
    expect(memberTab.messages).toEqual(ownerTab.messages)
    expect(JSON.stringify(ownerTab.messages)).not.toContain('secret-')
    ownerTab.close()
    memberTab.close()
  })

  it('publishes unavailable starter membership to another member without exposing a login', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const memberTab = await fixture.tab(0, undefined, fixture.memberCookie)
    await harness.env.DB.prepare(
      'UPDATE workspaces SET owner_user_id = ? WHERE id = ?',
    )
      .bind(fixture.member.id, WORKSPACE_ID)
      .run()
    await harness.env.DB.prepare(
      'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(fixture.org.id, fixture.owner.id)
      .run()
    const newTab = await fixture.tab(0, undefined, fixture.memberCookie)
    const response = await fixture.fetch(
      sessionsPath(fixture.org.id, WORKSPACE_ID),
      undefined,
      fixture.memberCookie,
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      sessions: [
        { startedBy: { id: fixture.owner.id }, loginAvailable: false },
      ],
    })
    expect(liveSessions(memberTab.messages)).toMatchObject([
      { id: session.id, loginAvailable: false },
    ])
    expect(newTab.messages[0]).toMatchObject({
      type: 'history',
      history: {
        events: [
          {
            event: {
              type: 'session.updated',
              session: { loginAvailable: true },
            },
          },
          {
            event: {
              type: 'session.updated',
              session: { loginAvailable: false },
            },
          },
        ],
      },
    })
    const linked = await fixture.send(
      session.id,
      'after-removal',
      fixture.memberCookie,
    )
    expect(linked.session.startedBy?.id).toBe(fixture.member.id)
    expect(linked.session.sourceSessionId).toBe(session.id)
    expect(linked.message.sessionId).toBe(linked.session.id)
    expect(JSON.stringify(memberTab.messages)).not.toContain('secret-')
    expect(JSON.stringify(newTab.messages)).not.toContain('secret-')
    memberTab.close()
    newTab.close()
  })

  it('checks the queued sender membership separately from the available starter login', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    await fixture.send(session.id, 'removed-sender', fixture.memberCookie)
    await harness.env.DB.prepare(
      'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(fixture.org.id, fixture.member.id)
      .run()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    expect(runner.commands).toEqual([])
    const response = await fixture.fetch(
      sessionsPath(fixture.org.id, WORKSPACE_ID),
    )
    expect(await response.json()).toMatchObject({
      sessions: [
        {
          loginAvailable: true,
          activeTurnId: null,
          retryMessageId: 'removed-sender',
        },
      ],
    })
    expect(
      (await fixture.history(session.id)).events.map(({ event }) => event),
    ).toContainEqual(
      expect.objectContaining({
        type: 'turn.failed',
        error: {
          code: 'agent_login_required',
          message: 'The message sender no longer has access to this workspace.',
        },
      }),
    )
  })
})
