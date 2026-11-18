import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../../src/shared/agent-tools'
import { workspaceEventsPath } from '../../../src/shared/events'
import { sessionsPath, sessionPaths } from '../../../src/shared/sessions'
import { orgEnvironmentContext } from '../../lifecycle/settings-data'
import { encrypt } from '../../security/crypto'
import { TEST_ORIGIN } from '../../test-support/harness'
import { array } from '../agent-events'
import { createAdapterRuntime } from '../adapter-runtime.test-support'
import { SocketInbox } from '../adapter-sockets.test-support'
import { runnerControls, disposeRunners } from '../runner-native.test-support'
import {
  CLAUDE,
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from '../harness.test-support'
import { record, string } from '../inputs'
import { OuterFakeRunner } from './runner-socket.test-support'

it('restores encrypted held text after native eviction and publishes the hidden continuation once', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/runner-entry.test-support.ts',
  )
  const sockets: WebSocket[] = []
  const controls = runnerControls(runtime, headers)
  const bindings = await runtime.getBindings<{
    BOAT_KEY_ENCRYPTION_KEY: string
  }>()
  const storedRecords = async () => {
    const response = await runtime.dispatchFetch(`${TEST_ORIGIN}/inspect`, {
      headers,
    })
    expect(response.status).toBe(200)
    return array(await response.json(), (value) => value)
  }
  const connect = async (eventNumber = 0) => {
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
    const runner = new OuterFakeRunner(socket, WORKSPACE_ID, {
      streamId: 'held-output',
      eventNumber,
    })
    expect(await runner.inbox.next()).toEqual({
      type: 'welcome',
      protocolVersion: 2,
      streamId: 'held-output',
      confirmedThrough: eventNumber,
    })
    return runner
  }
  const browser = async () => {
    const response = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${workspaceEventsPath('org', WORKSPACE_ID)}`,
      { headers: { ...headers, Upgrade: 'websocket' } },
    )
    expect(response.status).toBe(101)
    const socket = response.webSocket
    if (!socket) throw new Error('The browser socket is missing.')
    sockets.push(socket)
    const inbox = new SocketInbox(socket)
    socket.accept()
    return inbox
  }
  const confirm = (throughEventNumber: number) => ({
    type: 'confirm',
    streamId: 'held-output',
    throughEventNumber,
  })
  try {
    const db = await runtime.getD1Database('DB')
    await db
      .prepare(
        `INSERT INTO workspace_runtime
         (workspace_id, org_id, created_by_user_id, session_id, first_turn_id,
          environment_ciphertext, agent, model, effort, first_message_id)
         VALUES (?, 'org', 'owner', 'unused', 'unused', ?, 'claude', 'test', 'high', 'unused')`,
      )
      .bind(
        WORKSPACE_ID,
        await encrypt(
          JSON.stringify({ TOKEN: { value: 'private-value', secret: true } }),
          orgEnvironmentContext('org'),
          bindings.BOAT_KEY_ENCRYPTION_KEY,
        ),
      )
      .run()
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
          id: 'ask',
          choice: CLAUDE,
          text: 'Check the code',
          attachmentIds: [],
        }),
      },
    )
    expect(accepted.status).toBe(202)
    const runner = await connect()
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toEqual(confirm(1))
    const turn = record(await runner.inbox.next())
    expect(turn).toMatchObject({ type: 'turn', sessionId })
    const context = { sessionId, turnId: string(turn.turnId) }
    runner.emit({
      type: 'turn.started',
      ...context,
      senderId: 'owner',
      choice: CLAUDE,
      startedAt: 25,
      messageIds: ['ask'],
    })
    expect(await runner.inbox.next()).toEqual(confirm(2))
    const delta = {
      type: 'assistant.delta' as const,
      ...context,
      messageId: 'answer',
      text: 'private-',
    }
    runner.emit(delta)
    expect(await runner.inbox.next()).toEqual(confirm(3))
    const resumed = await browser()
    const pending = record(await resumed.next())
    expect(pending.type).toBe('history')
    expect(
      array(record(pending.history).events, record).filter(
        ({ event }) => record(event).type === 'assistant.delta',
      ),
    ).toEqual([])
    const stored = await storedRecords()
    expect(stored.length).toBeGreaterThan(0)
    expect(JSON.stringify(stored)).not.toContain('private-')
    const woke = await controls.hibernate()
    expect(woke.hello).toBe(1)
    expect(woke.ready).toBe(1)
    expect(
      runner.received.filter((value) => record(value).type === 'welcome'),
    ).toHaveLength(1)
    runner.emit({ ...delta, text: 'value' })
    expect(await runner.inbox.next()).toEqual(confirm(4))
    const continuation = await resumed.next()
    expect(continuation).toMatchObject({
      type: 'event',
      envelope: { event: { ...delta, text: '[redacted]' } },
    })
    runner.socket.send(
      JSON.stringify({
        type: 'event',
        streamId: 'held-output',
        eventNumber: 4,
        occurredAt: 1_800_000_000_004,
        event: { ...delta, text: 'value' },
      }),
    )
    expect(await runner.inbox.next()).toEqual(confirm(4))
    runner.socket.send(
      JSON.stringify({
        type: 'event',
        streamId: 'held-output',
        eventNumber: 6,
        occurredAt: 1_800_000_000_006,
        event: { ...delta, text: 'Skipped' },
      }),
    )
    expect(await runner.inbox.next()).toEqual({
      type: 'resend',
      streamId: 'held-output',
      fromEventNumber: 5,
    })
    runner.emit({ ...delta, text: '!' })
    expect(await runner.inbox.next()).toEqual(confirm(5))
    const tail = await resumed.next()
    expect(tail).toMatchObject({
      type: 'event',
      envelope: { event: { ...delta, text: '!' } },
    })
    const replay = record(await (await browser()).next())
    expect(replay.type).toBe('history')
    expect(
      array(record(replay.history).events, record).filter(
        ({ event }) => record(event).type === 'assistant.delta',
      ),
    ).toEqual([record(continuation).envelope, record(tail).envelope])
    expect(JSON.stringify(await storedRecords())).not.toContain('private-')
  } finally {
    await disposeRunners(runtime, sockets)
  }
})
