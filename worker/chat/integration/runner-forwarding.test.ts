import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  chatHistoryPath,
  workspaceEventsPath,
} from '../../../src/shared/events'
import { sessionsPath, sessionPaths } from '../../../src/shared/sessions'
import { closeSockets, SocketInbox } from '../adapter-sockets.test-support'
import { CLAUDE } from '../harness.test-support'
import { record, string } from '../inputs'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import { OuterFakeRunner, requestRunner } from './runner-socket.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
const sockets: WebSocket[] = []
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await closeSockets(...sockets)
  sockets.length = 0
  await fixture?.dispose()
  fixture = undefined
})

it('dispatches a queued sender message and streams text and Stop through bearer-only runner forwarding', async () => {
  fixture = await createOuterRuntime(bundle)
  const created = await fixture.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'POST',
      body: JSON.stringify({ choice: CLAUDE }),
    },
  )
  expect(created.status).toBe(201)
  const sessionId = string(record(record(await created.json()).session).id)
  const queued = await fixture.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    {
      method: 'POST',
      headers: { Cookie: fixture.cookies.memberCookie },
      body: JSON.stringify({
        id: 'runner-ask',
        text: 'Stream this answer',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(queued.status).toBe(202)
  expect(await queued.json()).toMatchObject({
    message: { id: 'runner-ask', state: 'queued', sender: { id: 'member' } },
    turnId: null,
  })
  const events = await fixture.request(
    workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE, 3),
    { headers: { Upgrade: 'websocket' } },
  )
  expect(events.status).toBe(101)
  const browser = events.webSocket
  if (!browser) throw new Error('The browser socket is missing.')
  sockets.push(browser)
  const browserInbox = new SocketInbox(browser)
  browser.accept()
  expect(await browserInbox.next()).toEqual({
    type: 'history',
    history: { events: [], throughEventNumber: 3 },
  })
  const connected = await requestRunner(fixture)
  expect(connected.status).toBe(101)
  expect(connected.headers.get('Cache-Control')).toBe('no-store')
  expect(connected.headers.get('Referrer-Policy')).toBe('no-referrer')
  const runnerSocket = connected.webSocket
  if (!runnerSocket) throw new Error('The runner socket is missing.')
  sockets.push(runnerSocket)
  const runner = new OuterFakeRunner(runnerSocket)
  expect(await runner.inbox.next()).toEqual({
    type: 'welcome',
    protocolVersion: 1,
    streamId: 'outer-runner-stream',
    confirmedThrough: 0,
  })
  runner.emit({ type: 'runner.ready' })
  expect(await runner.inbox.next()).toEqual({
    type: 'confirm',
    streamId: 'outer-runner-stream',
    throughEventNumber: 1,
  })
  const turn = record(await runner.inbox.next())
  expect(turn).toMatchObject({
    type: 'turn',
    sessionId,
    message: { id: 'runner-ask', state: 'sent', sender: { id: 'member' } },
    login: { secret: 'outer-secret-owner' },
  })
  const turnId = string(turn.turnId)
  expect(await browserInbox.next()).toMatchObject({
    type: 'event',
    envelope: {
      eventNumber: 4,
      event: { type: 'message.sent', messageId: 'runner-ask', turnId },
    },
  })
  runner.emit({
    type: 'assistant.delta',
    sessionId,
    turnId,
    messageId: 'runner-answer',
    text: 'Streamed through the Worker',
  })
  expect(await runner.inbox.next()).toEqual({
    type: 'confirm',
    streamId: 'outer-runner-stream',
    throughEventNumber: 2,
  })
  expect(await browserInbox.next()).toMatchObject({
    type: 'event',
    envelope: {
      eventNumber: 5,
      event: { type: 'assistant.delta', text: 'Streamed through the Worker' },
    },
  })
  const stopped = await fixture.request(
    sessionPaths.interrupt(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    { method: 'POST', body: JSON.stringify({ turnId }) },
  )
  expect(stopped.status).toBe(200)
  expect(await stopped.json()).toEqual({
    eventNumber: 6,
    turnId,
    state: 'stopping',
  })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'interrupt',
    sessionId,
    turnId,
  })
  expect(await browserInbox.next()).toMatchObject({
    type: 'event',
    envelope: {
      eventNumber: 6,
      event: { type: 'turn.stop-requested', requestedById: 'owner', turnId },
    },
  })
  runner.emit({
    type: 'turn.completed',
    sessionId,
    turnId,
    state: 'stopped',
    durationMs: 10,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['runner-ask'],
  })
  expect(await runner.inbox.next()).toEqual({
    type: 'confirm',
    streamId: 'outer-runner-stream',
    throughEventNumber: 3,
  })
  expect(await browserInbox.next()).toMatchObject({
    type: 'event',
    envelope: {
      eventNumber: 7,
      event: { type: 'turn.completed', state: 'stopped', turnId },
    },
  })
  expect(await browserInbox.next()).toMatchObject({
    type: 'event',
    envelope: {
      eventNumber: 8,
      event: { type: 'session.updated', session: { activeTurnId: null } },
    },
  })
  const history = await fixture.request(
    chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, sessionId),
  )
  expect(history.status).toBe(200)
  const stored: unknown = await history.json()
  expect(stored).toMatchObject({
    throughEventNumber: 8,
    events: [
      { eventNumber: 1, event: { type: 'session.updated' } },
      { eventNumber: 2, event: { type: 'message.accepted' } },
      { eventNumber: 3, event: { type: 'session.updated' } },
      { eventNumber: 4, event: { type: 'message.sent' } },
      {
        eventNumber: 5,
        event: { type: 'assistant.delta', text: 'Streamed through the Worker' },
      },
      {
        eventNumber: 6,
        event: { type: 'turn.stop-requested', requestedById: 'owner' },
      },
      { eventNumber: 7, event: { type: 'turn.completed', state: 'stopped' } },
      { eventNumber: 8, event: { type: 'session.updated' } },
    ],
  })
  expect(JSON.stringify(stored)).not.toContain('outer-secret-member')
  expect(JSON.stringify(stored)).not.toContain('outer-secret-owner')
})
