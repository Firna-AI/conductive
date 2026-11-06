import type { Miniflare } from 'miniflare'
import { expect } from 'vitest'

import { chatHistoryPath, workspaceEventsPath } from '../../src/shared/events'
import { TEST_ORIGIN } from '../test-support/harness'
import { closeSockets, SocketInbox } from './adapter-sockets.test-support'
import {
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from './harness.test-support'
import { record, string } from './inputs'
import { array } from './agent-events'

/** Continue the adapter test through an actual eviction with retained SQLite data. */
export async function verifyAdapterRestart(
  runtime: Miniflare,
  headers: Record<string, string>,
  sessionId: string,
  body: unknown,
  previousTurnId: string,
): Promise<void> {
  await runtime.unsafeEvictDurableObject('chat-adapter-tests', 'Workspace', {
    name: WORKSPACE_ID,
  })
  const restored = await runtime.dispatchFetch(
    `${TEST_ORIGIN}${chatHistoryPath('org', WORKSPACE_ID, sessionId)}`,
    { headers },
  )
  expect(restored.status).toBe(200)
  expect(await restored.json()).toEqual(body)
  const resumedBrowserResponse = await runtime.dispatchFetch(
    `${TEST_ORIGIN}${workspaceEventsPath('org', WORKSPACE_ID)}`,
    { headers: { ...headers, Upgrade: 'websocket' } },
  )
  expect(resumedBrowserResponse.status).toBe(101)
  const resumedBrowser = resumedBrowserResponse.webSocket
  if (!resumedBrowser)
    throw new Error('The restored browser socket is missing.')
  const resumedBrowserInbox = new SocketInbox(resumedBrowser)
  resumedBrowser.accept()
  expect(await resumedBrowserInbox.next()).toEqual({
    type: 'history',
    history: body,
  })
  const resumedRunnerResponse = await runtime.dispatchFetch(
    `${MACHINE_ORIGIN}/runner`,
    {
      headers: {
        Upgrade: 'websocket',
        Authorization: `Bearer ${WORKSPACE_TOKEN}`,
      },
    },
  )
  expect(resumedRunnerResponse.status).toBe(101)
  const resumedRunner = resumedRunnerResponse.webSocket
  if (!resumedRunner) throw new Error('The restored runner socket is missing.')
  const resumedRunnerInbox = new SocketInbox(resumedRunner)
  resumedRunner.accept()
  resumedRunner.send(
    JSON.stringify({
      type: 'hello',
      protocolVersion: 1,
      workspaceId: WORKSPACE_ID,
      streamId: 'adapter-stream',
    }),
  )
  expect(await resumedRunnerInbox.next()).toEqual({
    type: 'welcome',
    protocolVersion: 1,
    streamId: 'adapter-stream',
    confirmedThrough: 3,
  })
  const resumedTurn = record(await resumedRunnerInbox.next())
  expect(resumedTurn).toMatchObject({
    type: 'turn',
    sessionId,
    message: { id: 'offline-ask', state: 'sent' },
    login: { secret: 'adapter-secret' },
  })
  const sent = await resumedBrowserInbox.next()
  expect(sent).toMatchObject({
    type: 'event',
    envelope: {
      eventNumber: 10,
      event: { type: 'message.sent', messageId: 'offline-ask' },
    },
  })
  resumedRunner.send(
    JSON.stringify({
      type: 'event',
      streamId: 'adapter-stream',
      eventNumber: 2,
      occurredAt: 2,
      event: {
        type: 'assistant.delta',
        sessionId,
        turnId: previousTurnId,
        messageId: 'answer',
        text: 'Stored in SQLite',
      },
    }),
  )
  expect(await resumedRunnerInbox.next()).toEqual({
    type: 'confirm',
    streamId: 'adapter-stream',
    throughEventNumber: 3,
  })
  resumedRunner.send(
    JSON.stringify({
      type: 'event',
      streamId: 'adapter-stream',
      eventNumber: 4,
      occurredAt: 4,
      event: {
        type: 'assistant.delta',
        sessionId,
        turnId: string(resumedTurn.turnId),
        messageId: 'resumed-answer',
        text: 'Continued after eviction',
      },
    }),
  )
  expect(await resumedRunnerInbox.next()).toEqual({
    type: 'confirm',
    streamId: 'adapter-stream',
    throughEventNumber: 4,
  })
  const live = await resumedBrowserInbox.next()
  expect(live).toMatchObject({
    type: 'event',
    envelope: {
      eventNumber: 11,
      event: { type: 'assistant.delta', text: 'Continued after eviction' },
    },
  })
  const continued = await runtime.dispatchFetch(
    `${TEST_ORIGIN}${chatHistoryPath('org', WORKSPACE_ID, sessionId)}`,
    { headers },
  )
  expect(continued.status).toBe(200)
  expect(await continued.json()).toEqual({
    throughEventNumber: 11,
    events: [
      ...array(record(body).events, record),
      record(sent).envelope,
      record(live).envelope,
    ],
  })
  await closeSockets(resumedRunner, resumedBrowser)
}
