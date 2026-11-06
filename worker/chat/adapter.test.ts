import { expect, it } from 'vitest'

import { chatHistoryPath, workspaceEventsPath } from '../../src/shared/events'
import { sessionsPath, sessionPaths } from '../../src/shared/sessions'
import { TEST_ORIGIN } from '../test-support/harness'
import {
  createAdapterRuntime,
  SocketInbox,
} from './adapter-runtime.test-support'
import {
  CLAUDE,
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from './harness.test-support'
import { record, string } from './inputs'

it('serves the actual Durable Object with SQLite storage and authenticated WebSockets', async () => {
  const { runtime, headers } = await createAdapterRuntime()
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
          id: 'ask',
          choice: CLAUDE,
          text: 'Check the code',
          attachmentIds: [],
        }),
      },
    )
    expect(accepted.status).toBe(202)
    const browserResponse = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${workspaceEventsPath('org', WORKSPACE_ID)}`,
      { headers: { ...headers, Upgrade: 'websocket' } },
    )
    expect(browserResponse.status).toBe(101)
    const browser = browserResponse.webSocket
    if (!browser) throw new Error('The browser socket is missing.')
    const browserInbox = new SocketInbox(browser)
    browser.accept()
    expect(await browserInbox.next()).toMatchObject({
      type: 'history',
      history: { throughEventNumber: 3 },
    })
    const runnerResponse = await runtime.dispatchFetch(
      `${MACHINE_ORIGIN}/runner`,
      {
        headers: {
          Upgrade: 'websocket',
          Authorization: `Bearer ${WORKSPACE_TOKEN}`,
        },
      },
    )
    expect(runnerResponse.status).toBe(101)
    const runner = runnerResponse.webSocket
    if (!runner) throw new Error('The runner socket is missing.')
    const runnerInbox = new SocketInbox(runner)
    runner.accept()
    runner.send(
      JSON.stringify({
        type: 'hello',
        protocolVersion: 1,
        workspaceId: WORKSPACE_ID,
        streamId: 'adapter-stream',
      }),
    )
    expect(await runnerInbox.next()).toEqual({
      type: 'welcome',
      protocolVersion: 1,
      streamId: 'adapter-stream',
      confirmedThrough: 0,
    })
    runner.send(
      JSON.stringify({
        type: 'event',
        streamId: 'adapter-stream',
        eventNumber: 1,
        occurredAt: 1,
        event: { type: 'runner.ready' },
      }),
    )
    expect(await runnerInbox.next()).toEqual({
      type: 'confirm',
      streamId: 'adapter-stream',
      throughEventNumber: 1,
    })
    const turn = record(await runnerInbox.next())
    expect(turn).toMatchObject({
      type: 'turn',
      sessionId,
      message: { sender: { id: 'owner' } },
      login: { secret: 'adapter-secret' },
    })
    expect(await browserInbox.next()).toMatchObject({
      type: 'event',
      envelope: { eventNumber: 4, event: { type: 'message.sent' } },
    })
    runner.send(
      JSON.stringify({
        type: 'event',
        streamId: 'adapter-stream',
        eventNumber: 2,
        occurredAt: 2,
        event: {
          type: 'assistant.delta',
          sessionId,
          turnId: string(turn.turnId),
          messageId: 'answer',
          text: 'Stored in SQLite',
        },
      }),
    )
    expect(await runnerInbox.next()).toEqual({
      type: 'confirm',
      streamId: 'adapter-stream',
      throughEventNumber: 2,
    })
    expect(await browserInbox.next()).toMatchObject({
      type: 'event',
      envelope: {
        eventNumber: 5,
        event: { type: 'assistant.delta', text: 'Stored in SQLite' },
      },
    })
    runner.close(1000)
    browser.close(1000)
    const history = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${chatHistoryPath('org', WORKSPACE_ID, sessionId)}`,
      { headers },
    )
    expect(history.status).toBe(200)
    const body: unknown = await history.json()
    expect(body).toMatchObject({
      throughEventNumber: 5,
      events: expect.arrayContaining([
        expect.objectContaining({
          eventNumber: 5,
          event: expect.objectContaining({ text: 'Stored in SQLite' }),
        }),
      ]),
    })
    expect(JSON.stringify(body)).not.toContain('adapter-secret')
  } finally {
    await runtime.dispose()
  }
})
