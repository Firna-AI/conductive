import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { sessionPaths } from '../../src/shared/sessions'
import type { SendMessageResponse } from '../../src/shared/messages'
import { createHarness, type TestHarness } from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { liveSessions, sessionRecord } from './retry.test-support'
import { messageCommands, startTurn } from './turn-lifecycle.test-support'
import { expectGatewayLogin } from './runner-credential.test-support'
describe('empty linked sessions', () => {
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
  it('opens an empty linked session and preserves the source running turn and real senders in two peers', async () => {
    const fixture = await createChatFixture(harness)
    const source = await fixture.createSession()
    const ownerTab = await fixture.tab()
    const memberTab = await fixture.tab(0, undefined, fixture.memberCookie)
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const original = await startTurn(fixture, runner, source.id, 'original')
    runner.emit({
      type: 'assistant.delta',
      sessionId: source.id,
      turnId: original.turnId,
      messageId: 'answer',
      text: 'Private source conversation',
    })
    await fixture.drain()
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.owner.id)
      .run()
    const reply = await fixture.send(
      source.id,
      'linked',
      fixture.memberCookie,
      CLAUDE,
      'Name this linked session.\nKeep the source conversation separate',
    )
    expect(reply.session).toMatchObject({
      title: 'Name this linked session',
      startedBy: { id: fixture.member.id },
      sourceSessionId: source.id,
      loginAvailable: true,
      retryMessageId: null,
    })
    expect(reply.session.id).not.toBe(source.id)
    expect(reply.message.sessionId).toBe(reply.session.id)
    expect(messageCommands(runner, 'linked')).toMatchObject([
      {
        type: 'turn',
        sessionId: reply.session.id,
        message: { sender: { id: fixture.member.id } },
      },
    ])
    await expectGatewayLogin(
      fixture,
      messageCommands(runner, 'linked')[0],
      `secret-${fixture.member.id}-claude`,
    )
    const sourceRecord = await sessionRecord(fixture, source.id)
    expect(sourceRecord).toMatchObject({
      startedBy: { id: fixture.owner.id },
      activeTurnId: original.turnId,
      loginAvailable: false,
    })
    const sourceHistory = await fixture.history(source.id)
    expect(
      sourceHistory.events
        .filter(({ event }) => event.type === 'message.accepted')
        .map(({ event }) => event),
    ).toMatchObject([
      {
        message: {
          id: 'original',
          sessionId: source.id,
          sender: { id: fixture.owner.id },
        },
      },
    ])
    const targetHistory = await fixture.history(reply.session.id)
    expect(targetHistory.events.map(({ event }) => event.type)).toEqual([
      'session.updated',
      'message.accepted',
      'session.updated',
      'message.sent',
    ])
    expect(JSON.stringify(targetHistory)).not.toContain(
      'Private source conversation',
    )
    expect(memberTab.messages).toEqual(ownerTab.messages)
    expect(JSON.stringify(ownerTab.messages)).not.toContain('secret-')
    expect(
      liveSessions(ownerTab.messages)
        .filter((session) => session.id === source.id)
        .at(-1)?.loginAvailable,
    ).toBe(false)
    await ownerTab.close()
    await memberTab.close()
  })
  it('replays a redirected message after a committed reply loss and restart even when the starter login returns', async () => {
    const fixture = await createChatFixture(harness)
    const source = await fixture.createSession()
    const storedLogin = await harness.env.DB.prepare(
      'SELECT kind, ciphertext FROM agent_logins WHERE user_id = ? AND agent = ?',
    )
      .bind(fixture.owner.id, 'claude')
      .first<{
        kind: string
        ciphertext: string
      }>()
    if (!storedLogin) throw new Error('The fixture login is missing.')
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.owner.id)
      .run()
    const path = sessionPaths.messages(fixture.org.id, WORKSPACE_ID, source.id)
    const input = {
      id: '__proto__',
      text: 'Keep this new request',
      choice: CLAUDE,
      attachmentIds: [],
    }
    const observation = await fixture.tab(0, undefined, fixture.memberCookie)
    expect((await sessionRecord(fixture, source.id)).loginAvailable).toBe(false)
    await observation.close()
    await fixture.failNextCommit('after', 'Injected post-commit crash')
    const lost = await fixture.fetch(path, input, fixture.memberCookie)
    expect(lost.status).toBe(500)
    const committed = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.message(input.id),
    )
    expect(committed).toMatchObject({
      id: '__proto__',
      sender: { id: fixture.member.id },
      state: 'queued',
    })
    expect(committed?.sessionId).not.toBe(source.id)
    await fixture.restart()
    const replay = await fixture.fetch(path, input, fixture.memberCookie)
    expect(replay.status).toBe(202)
    const accepted: SendMessageResponse = await replay.json()
    expect(accepted).toMatchObject({
      session: { sourceSessionId: source.id },
      message: { id: '__proto__' },
    })
    await harness.env.DB.prepare(
      'INSERT INTO agent_logins (user_id, agent, kind, ciphertext, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(
        fixture.owner.id,
        'claude',
        storedLogin.kind,
        storedLogin.ciphertext,
        fixture.clock.now(),
        fixture.clock.now(),
      )
      .run()
    const again = await fixture.fetch(path, input, fixture.memberCookie)
    expect(await again.json()).toEqual(accepted)
    const target = accepted.message.sessionId
    expect(
      await (
        await fixture.fetch(
          sessionPaths.messages(fixture.org.id, WORKSPACE_ID, target),
          input,
          fixture.memberCookie,
        )
      ).json(),
    ).toEqual(accepted)
    expect(
      (await fixture.history(target)).events.filter(
        ({ event }) => event.type === 'message.accepted',
      ),
    ).toHaveLength(1)
    expect(
      (await fixture.history(source.id)).events.filter(
        ({ event }) => event.type === 'message.accepted',
      ),
    ).toEqual([])
    const changed = await fixture.fetch(
      path,
      { ...input, text: 'Changed' },
      fixture.memberCookie,
    )
    expect(changed.status).toBe(409)
    expect(await changed.json()).toMatchObject({
      error: { code: 'message_id_conflict' },
    })
    const unrelated = await fixture.createSession()
    expect(
      (
        await fixture.fetch(
          sessionPaths.messages(fixture.org.id, WORKSPACE_ID, unrelated.id),
          input,
          fixture.memberCookie,
        )
      ).status,
    ).toBe(409)
  })
  it('keeps missing-logins responses atomic without creating an orphan linked session', async () => {
    const fixture = await createChatFixture(harness)
    const source = await fixture.createSession()
    await harness.env.DB.prepare('DELETE FROM agent_logins').run()
    const path = sessionPaths.messages(fixture.org.id, WORKSPACE_ID, source.id)
    const input = {
      id: 'cannot-send',
      text: 'Wait for a login',
      choice: CLAUDE,
      attachmentIds: [],
    }
    for (const cookie of [fixture.ownerCookie, fixture.memberCookie]) {
      const response = await fixture.fetch(path, input, cookie)
      expect(response.status).toBe(409)
      expect(await response.json()).toEqual({
        error: {
          code: 'agent_login_required',
          message: 'Connect your agent login to send a message.',
        },
      })
    }
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.sessions()),
    ).toHaveLength(1)
    expect(
      (await fixture.history(source.id)).events.filter(
        ({ event }) => event.type === 'message.accepted',
      ),
    ).toEqual([])
  })
})
