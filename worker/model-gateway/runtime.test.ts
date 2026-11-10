import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { readSessions } from '../../src/chat/api/read-responses'
import { readStoredEvents } from '../../src/chat/api/read-workspace'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { chatHistoryPath } from '../../src/shared/events'
import { sessionPaths, sessionsPath } from '../../src/shared/sessions'
import { createAdapterRuntime } from '../chat/adapter-runtime.test-support'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import {
  CLAUDE,
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import { TEST_ORIGIN } from '../test-support/harness'

it('retains a gateway failure and Stop through SQLite eviction, then ends once and enables Retry', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/integration/gateway-entry.test-support.ts',
  )
  const sockets: WebSocket[] = []
  const connect = async () => {
    const response = await runtime.dispatchFetch(
      `${MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
      {
        headers: {
          Upgrade: 'websocket',
          Authorization: `Bearer ${WORKSPACE_TOKEN}`,
        },
      },
    )
    expect(response.status).toBe(101)
    const socket = response.webSocket
    if (!socket) throw new Error('The runner socket is missing.')
    sockets.push(socket)
    const inbox = new SocketInbox(socket)
    const received: unknown[] = []
    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string')
        throw new Error('Expected a text socket message.')
      received.push(JSON.parse(event.data))
    })
    socket.accept()
    socket.send(
      JSON.stringify({
        type: 'hello',
        protocolVersion: 1,
        workspaceId: WORKSPACE_ID,
        streamId: 'gateway-stream',
      }),
    )
    expect(await inbox.next()).toMatchObject({ type: 'welcome' })
    return { socket, inbox, received }
  }
  try {
    const created = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${sessionsPath('org', WORKSPACE_ID)}`,
      { method: 'POST', headers, body: JSON.stringify({ choice: CLAUDE }) },
    )
    expect(created.status).toBe(201)
    const sessionId = string(record(record(await created.json()).session).id)
    const accepted = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${sessionPaths.messages('org', WORKSPACE_ID, sessionId)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: 'gateway-message',
          choice: CLAUDE,
          text: 'Check the code',
          attachmentIds: [],
        }),
      },
    )
    expect(accepted.status).toBe(202)
    const runner = await connect()
    runner.socket.send(
      JSON.stringify({
        type: 'event',
        streamId: 'gateway-stream',
        eventNumber: 1,
        occurredAt: 1,
        event: { type: 'runner.ready' },
      }),
    )
    expect(await runner.inbox.next()).toMatchObject({ type: 'confirm' })
    const turnId = string(record(await runner.inbox.next()).turnId)
    const issue = async () => {
      const response = await runtime.dispatchFetch(
        `${TEST_ORIGIN}/issue?turnId=${encodeURIComponent(turnId)}`,
      )
      expect(response.status).toBe(200)
      return string(record(await response.json()).token)
    }
    const token = await issue()
    await closeSockets(...sockets)
    await runtime.unsafeEvictDurableObject('chat-adapter-tests', 'Workspace', {
      name: WORKSPACE_ID,
    })
    expect(await issue()).toBe(token)
    const db = await runtime.getD1Database('DB')
    const check = async () => {
      const response = await runtime.dispatchFetch(`${TEST_ORIGIN}/check`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
      expect(response.status).toBe(200)
      const result: unknown = await response.json()
      return result
    }
    expect(await check()).toEqual({
      ok: true,
      login: { agent: 'claude', kind: 'api-key', secret: 'adapter-secret' },
    })
    await db
      .prepare(
        "UPDATE agent_logins SET updated_at = 2 WHERE user_id = 'owner' AND agent = 'claude'",
      )
      .run()
    expect(await check()).toEqual({
      ok: false,
      reason: 'agent_login_changed',
    })
    expect(await check()).toEqual({
      ok: false,
      reason: 'turn_not_active',
    })
    await runtime.unsafeEvictDurableObject('chat-adapter-tests', 'Workspace', {
      name: WORKSPACE_ID,
    })
    const reconnected = await connect()
    expect(await reconnected.inbox.next()).toMatchObject({
      type: 'interrupt',
      sessionId,
      turnId,
    })
    const end = {
      type: 'event',
      streamId: 'gateway-stream',
      eventNumber: 2,
      occurredAt: 2,
      event: {
        type: 'turn.completed',
        sessionId,
        turnId,
        state: 'stopped',
        durationMs: 25,
        files: [
          { path: 'changed.ts', change: 'modified', added: 2, removed: 1 },
        ],
        omittedFileCount: 0,
        userMessageIds: ['gateway-message'],
      },
    }
    reconnected.socket.send(JSON.stringify(end))
    expect(await reconnected.inbox.next()).toMatchObject({
      type: 'confirm',
      throughEventNumber: 2,
    })
    reconnected.socket.send(JSON.stringify(end))
    expect(await reconnected.inbox.next()).toMatchObject({
      type: 'confirm',
      throughEventNumber: 2,
    })
    const response = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${chatHistoryPath('org', WORKSPACE_ID, sessionId, 0)}`,
      { headers },
    )
    expect(response.status).toBe(200)
    const history = readStoredEvents(await response.json())
    expect(
      history.envelopes
        .filter(
          ({ event, late }) =>
            !late &&
            (event?.type === 'turn.failed' || event?.type === 'turn.completed'),
        )
        .map(({ event }) => event),
    ).toMatchObject([
      {
        type: 'turn.failed',
        sessionId,
        turnId,
        error: {
          code: 'agent_login_required',
          message:
            "owner's Claude login changed. Try again to use the new login.",
        },
        retryMessageId: 'gateway-message',
      },
    ])
    expect(
      history.envelopes.filter(({ late }) => late).map(({ event }) => event),
    ).toEqual([end.event])
    const listed = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${sessionsPath('org', WORKSPACE_ID)}`,
      { headers },
    )
    expect(listed.status).toBe(200)
    const sessions = readSessions(await listed.json())
    expect(sessions.sessions).toMatchObject([
      { id: sessionId, activeTurnId: null, retryMessageId: 'gateway-message' },
    ])
    expect(
      reconnected.received.filter(
        (value) => record(value).type === 'interrupt',
      ),
    ).toHaveLength(1)
  } finally {
    await closeSockets(...sockets)
    await runtime.dispose()
  }
})
