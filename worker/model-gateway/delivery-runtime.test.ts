import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
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

it('redelivers the dispatched protocol 2 credential after SQLite eviction without storing credentials', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/integration/gateway-entry.test-support.ts',
  )
  const sockets: WebSocket[] = []
  const db = await runtime.getD1Database('DB')
  await db
    .prepare('UPDATE workspaces SET runner_protocol_version = 2 WHERE id = ?')
    .bind(WORKSPACE_ID)
    .run()
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
    socket.accept()
    socket.send(
      JSON.stringify({
        type: 'hello',
        protocolVersion: 2,
        workspaceId: WORKSPACE_ID,
        streamId: 'v2-storage-stream',
      }),
    )
    expect(await inbox.next()).toMatchObject({
      type: 'welcome',
      protocolVersion: 2,
    })
    return { socket, inbox }
  }
  const inspect = async () => {
    const response = await runtime.dispatchFetch(`${TEST_ORIGIN}/inspect`)
    expect(response.status).toBe(200)
    const value: unknown = await response.json()
    return JSON.stringify(value)
  }
  try {
    const created = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${sessionsPath('org', WORKSPACE_ID)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ choice: CLAUDE }),
      },
    )
    expect(created.status).toBe(201)
    const sessionId = string(record(record(await created.json()).session).id)
    const accepted = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${sessionPaths.messages('org', WORKSPACE_ID, sessionId)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: 'v2-storage-message',
          text: 'Check the code',
          choice: CLAUDE,
          attachmentIds: [],
        }),
      },
    )
    expect(accepted.status).toBe(202)
    const runner = await connect()
    runner.socket.send(
      JSON.stringify({
        type: 'event',
        streamId: 'v2-storage-stream',
        eventNumber: 1,
        occurredAt: 1,
        event: { type: 'runner.ready' },
      }),
    )
    expect(await runner.inbox.next()).toMatchObject({ type: 'confirm' })
    const turn = record(await runner.inbox.next())
    expect(turn).toMatchObject({
      type: 'turn',
      credential: {
        agent: 'claude',
        kind: 'api-key',
        token: expect.stringMatching(/^sk-ant-api-/),
      },
    })
    expect(turn).not.toHaveProperty('login')
    const token = string(record(turn.credential).token)
    const stored = await inspect()
    expect(stored).toContain('"nonce":')
    expect(stored).toContain('"loginVersion":1')
    expect(stored).not.toContain(token)
    expect(stored).not.toContain('adapter-secret')
    expect(stored).not.toContain('"credential":')
    await closeSockets(...sockets)
    await runtime.unsafeEvictDurableObject('chat-adapter-tests', 'Workspace', {
      name: WORKSPACE_ID,
    })
    const resumed = await connect()
    expect(await resumed.inbox.next()).toEqual(turn)
    expect(await inspect()).not.toContain(token)
    const checked = await runtime.dispatchFetch(`${TEST_ORIGIN}/check`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
    expect(checked.status).toBe(200)
    expect(await checked.json()).toEqual({
      ok: true,
      login: { agent: 'claude', kind: 'api-key', secret: 'adapter-secret' },
    })
  } finally {
    await closeSockets(...sockets)
    await runtime.dispose()
  }
})
