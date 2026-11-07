import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import type { SendMessageResponse } from '../../src/shared/messages'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  liveSessions,
  retryRequest,
  retryUnavailable,
  sessionRecord,
} from './retry.test-support'

describe('linked retry after starter revocation', () => {
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

  it('fails queued input in its original session and consumes its retry only after linked acceptance commits', async () => {
    const fixture = await createChatFixture(harness)
    const source = await fixture.createSession()
    await fixture.send(source.id, 'queued', fixture.memberCookie)
    const ownerTab = await fixture.tab()
    const memberTab = await fixture.tab(0, undefined, fixture.memberCookie)
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.owner.id)
      .run()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    expect(runner.commands).toEqual([])
    expect(await sessionRecord(fixture, source.id)).toMatchObject({
      loginAvailable: false,
      activeTurnId: null,
      retryMessageId: 'queued',
      startedBy: { id: fixture.owner.id },
    })
    const failure = (await fixture.history(source.id)).events
      .map(({ event }) => event)
      .find((event) => event.type === 'turn.failed')
    expect(failure).toMatchObject({
      error: {
        code: 'agent_login_required',
        message:
          "Octocat's Claude login is not available. Try again or send a new message.",
      },
      retryMessageId: 'queued',
    })
    const before = await fixture.history(source.id)
    fixture.storage.failCommit = true
    expect(
      (await retryRequest(fixture, source.id, 'queued', fixture.memberCookie))
        .status,
    ).toBe(500)
    fixture.storage.failCommit = false
    expect((await sessionRecord(fixture, source.id)).retryMessageId).toBe(
      'queued',
    )
    expect(await fixture.history(source.id)).toEqual(before)
    const response = await retryRequest(
      fixture,
      source.id,
      'queued',
      fixture.memberCookie,
    )
    expect(response.status).toBe(202)
    const linked: SendMessageResponse = await response.json()
    expect(linked).toMatchObject({
      session: {
        startedBy: { id: fixture.member.id },
        sourceSessionId: source.id,
        retryMessageId: null,
      },
      message: { sender: { id: fixture.member.id }, text: 'Check this code' },
    })
    expect(linked.message.sessionId).toBe(linked.session.id)
    expect((await sessionRecord(fixture, source.id)).retryMessageId).toBeNull()
    const stale = await retryRequest(
      fixture,
      source.id,
      'queued',
      fixture.ownerCookie,
    )
    expect(stale.status).toBe(409)
    expect(await stale.json()).toEqual(retryUnavailable)
    expect(
      (await fixture.history(source.id)).events.filter(
        ({ event }) => event.type === 'message.accepted',
      ),
    ).toMatchObject([
      { event: { message: { id: 'queued', sessionId: source.id } } },
    ])
    expect(
      liveSessions(ownerTab.messages)
        .filter((record) => record.id === source.id)
        .map((record) => record.retryMessageId),
    ).toEqual([null, 'queued', null])
    expect(memberTab.messages).toEqual(ownerTab.messages)
    ownerTab.close()
    memberTab.close()
  })

  it('keeps every linked Retry acceptance record after a post-commit crash and restart', async () => {
    const ids = [
      'source',
      'source-turn',
      'source-command',
      'retry-message',
      'linked',
      'linked-turn',
      'linked-command',
    ]
    const fixture = await createChatFixture(harness, {
      randomId: () => {
        const id = ids.shift()
        if (!id) throw new Error('The test ID sequence is empty.')
        return id
      },
    })
    await fixture.createSession()
    await fixture.send('source', 'queued')
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.owner.id)
      .run()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    expect(await sessionRecord(fixture, 'source')).toMatchObject({
      loginAvailable: false,
      activeTurnId: null,
      retryMessageId: 'queued',
    })
    expect(runner.commands).toEqual([])
    fixture.storage.crashAfterCommit = true
    const response = await retryRequest(
      fixture,
      'source',
      'queued',
      fixture.memberCookie,
    )
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: {
        code: 'internal_error',
        message: 'The request failed. Try again.',
      },
    })
    runner.disconnect()
    fixture.restart()
    const stored = await fixture.chat.store.read(
      WORKSPACE_ID,
      async (view) => ({
        session: await view.session('linked'),
        message: await view.message('retry-message'),
        turn: await view.turn('linked-turn'),
        commands: await view.pending(),
        source: await view.session('source'),
        messageSource: await view.messageSource('retry-message'),
        messageTurn: await view.messageTurn('retry-message'),
        newestTurn: await view.newestTurn('linked'),
      }),
    )
    expect(stored).toEqual({
      session: {
        id: 'linked',
        workspaceId: WORKSPACE_ID,
        title: 'New session',
        choice: { agent: 'claude', model: 'test-claude', effort: 'high' },
        createdAt: TEST_TIME,
        closedAt: null,
        activeTurnId: 'linked-turn',
        retryMessageId: null,
        startedBy: {
          id: fixture.member.id,
          githubLogin: 'teammate',
          displayName: 'Teammate',
          avatarUrl: null,
        },
        sourceSessionId: 'source',
        loginAvailable: true,
      },
      message: {
        id: 'retry-message',
        sessionId: 'linked',
        text: 'Check this code',
        sender: {
          id: fixture.member.id,
          githubLogin: 'teammate',
          displayName: 'Teammate',
          avatarUrl: null,
        },
        attachments: [],
        choice: { agent: 'claude', model: 'test-claude', effort: 'high' },
        createdAt: TEST_TIME,
        state: 'queued',
      },
      turn: {
        id: 'linked-turn',
        sessionId: 'linked',
        senderId: fixture.member.id,
        messageIds: ['retry-message'],
        state: 'queued',
        closeAfterStop: false,
        nextTurnId: null,
      },
      commands: [
        {
          type: 'turn',
          commandId: 'linked-command',
          sessionId: 'linked',
          turnId: 'linked-turn',
          messageId: 'retry-message',
          attachments: [],
        },
      ],
      source: {
        id: 'source',
        workspaceId: WORKSPACE_ID,
        title: 'New session',
        choice: { agent: 'claude', model: 'test-claude', effort: 'high' },
        createdAt: TEST_TIME,
        closedAt: null,
        activeTurnId: null,
        retryMessageId: null,
        startedBy: {
          id: fixture.owner.id,
          githubLogin: 'octocat',
          displayName: 'Octocat',
          avatarUrl: null,
        },
        sourceSessionId: null,
        loginAvailable: false,
      },
      messageSource: 'source',
      messageTurn: 'linked-turn',
      newestTurn: 'linked-turn',
    })
    const duplicate = await retryRequest(
      fixture,
      'source',
      'queued',
      fixture.memberCookie,
    )
    expect(duplicate.status).toBe(409)
    expect(await duplicate.json()).toEqual(retryUnavailable)
    expect(await sessionRecord(fixture, 'source')).toEqual(stored.source)
  })
})
