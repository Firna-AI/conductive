import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../../src/shared/agent-tools'
import { chatHistoryPath } from '../../../src/shared/events'
import { sessionsPath, sessionPaths } from '../../../src/shared/sessions'
import { closeSockets } from '../adapter-sockets.test-support'
import { CLAUDE } from '../harness.test-support'
import { record, string } from '../inputs'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import {
  OTHER_TOKEN,
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_TOKEN,
  OUTER_WORKSPACE,
} from './outer-seed.test-support'
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

it('refuses runner upgrades without a current workspace token and preserves the machine hostname check', async () => {
  fixture = await createOuterRuntime(bundle)
  for (const token of [null, 'unknown-workspace-token']) {
    const response = await requestRunner(fixture, token)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: {
        code: 'workspace_token_required',
        message: 'The connection is not available.',
      },
    })
    expect(response.webSocket).toBeNull()
  }
  await fixture.env.DB.prepare(
    'UPDATE workspace_tokens SET revoked_at = 1 WHERE workspace_id = ?',
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const revoked = await requestRunner(fixture, OUTER_TOKEN)
  expect(revoked.status).toBe(401)
  expect(await revoked.json()).toMatchObject({
    error: { code: 'workspace_token_required' },
  })
  expect(revoked.webSocket).toBeNull()
  const foreignHost = await fixture.runtime.dispatchFetch(
    `https://other.conductive.test${MACHINE_PATHS.runner}`,
    {
      headers: { Upgrade: 'websocket', Authorization: `Bearer ${OTHER_TOKEN}` },
    },
  )
  expect(foreignHost.status).toBe(403)
  expect(await foreignHost.json()).toMatchObject({
    error: { code: 'origin_forbidden' },
  })
  expect(foreignHost.webSocket).toBeNull()
})

it('keeps a foreign runner token in its own workspace and refuses a different workspace hello', async () => {
  fixture = await createOuterRuntime(bundle)
  const created = await fixture.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ choice: CLAUDE }) },
  )
  expect(created.status).toBe(201)
  const sessionId = string(record(record(await created.json()).session).id)
  const queued = await fixture.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'private-ask',
        text: 'Keep this in its workspace',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(queued.status).toBe(202)
  const connected = await requestRunner(fixture, OTHER_TOKEN)
  expect(connected.status).toBe(101)
  const socket = connected.webSocket
  if (!socket) throw new Error('The runner socket is missing.')
  sockets.push(socket)
  const received: unknown[] = []
  socket.addEventListener('message', (event) => {
    received.push(event.data)
  })
  const runner = new OuterFakeRunner(socket, OUTER_WORKSPACE)
  expect(await runner.closed).toEqual({
    code: 1000,
    reason: 'Connection closed.',
  })
  expect(received).toEqual([])
  const history = await fixture.request(
    chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, sessionId),
  )
  expect(history.status).toBe(200)
  expect(await history.json()).toMatchObject({
    throughEventNumber: 3,
    events: [
      { eventNumber: 1, event: { type: 'session.updated' } },
      {
        eventNumber: 2,
        event: {
          type: 'message.accepted',
          message: { id: 'private-ask', state: 'queued' },
        },
      },
      { eventNumber: 3, event: { type: 'session.updated' } },
    ],
  })
  const other = await fixture.request(sessionsPath(OUTER_ORG, OTHER_WORKSPACE))
  expect(other.status).toBe(200)
  expect(await other.json()).toEqual({
    eventNumber: 0,
    sessions: [],
    history: [],
  })
})
