import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { readWorkspaces } from '../../../src/app/api/read-workspaces'
import { sessionsPath, sessionPaths } from '../../../src/shared/sessions'
import { workspacePaths, workspacesPath } from '../../../src/shared/workspaces'
import { closeSockets } from '../adapter-sockets.test-support'
import { CLAUDE } from '../harness.test-support'
import { record, string } from '../inputs'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import { OuterFakeRunner, requestRunner } from './runner-socket.test-support'
import { seedShellWorkspaceRuntime } from './shell-api.test-support'

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

it('uses real chat state and bounded monotonic read marks for each member', async () => {
  const active = (fixture = await createOuterRuntime(bundle))
  const actor = await seedShellWorkspaceRuntime(active)
  const created = await active.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'POST',
      body: JSON.stringify({ choice: CLAUDE }),
    },
  )
  expect(created.status).toBe(201)
  const sessionId = string(record(record(await created.json()).session).id)
  const sent = await active.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'read-state-message',
        text: 'Return a result',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(sent.status).toBe(202)
  const connected = await requestRunner(active)
  expect(connected.status).toBe(101)
  const socket = connected.webSocket
  if (!socket) throw new Error('The runner socket is missing.')
  sockets.push(socket)
  const runner = new OuterFakeRunner(socket)
  expect(await runner.inbox.next()).toMatchObject({ type: 'welcome' })
  runner.emit({ type: 'runner.ready' })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  const turn = record(await runner.inbox.next())
  expect(turn).toMatchObject({ type: 'turn' })
  const turnId = string(turn.turnId)
  const stateFor = async (cookie = active.cookies.ownerCookie) => {
    const response = await active.request(workspacesPath(OUTER_ORG), {
      headers: { Cookie: cookie },
    })
    expect(response.status).toBe(200)
    return readWorkspaces(await response.json()).find(
      (workspace) => workspace.id === OUTER_WORKSPACE,
    )?.state
  }
  expect(await stateFor()).toBe('working')
  runner.emit({
    type: 'assistant.completed',
    sessionId,
    turnId,
    messageId: 'first-answer',
    text: 'First result',
    userMessageIds: ['read-state-message'],
  })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 2,
  })
  runner.emit({
    type: 'turn.completed',
    sessionId,
    turnId,
    state: 'finished',
    durationMs: 10,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['read-state-message'],
  })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 3,
  })
  expect(await stateFor()).toBe('unread')
  const summary = await actor().readChatWorkspaceSummary()
  const markRead = (throughEventNumber: number) =>
    active.request(workspacePaths.read(OUTER_ORG, OUTER_WORKSPACE), {
      method: 'PUT',
      body: JSON.stringify({ throughEventNumber }),
    })
  expect((await markRead(Number.MAX_SAFE_INTEGER)).status).toBe(204)
  const stored = () =>
    active.env.DB.prepare(
      `SELECT through_event_number AS throughEventNumber FROM workspace_read_states
     WHERE workspace_id = ? AND user_id = 'owner'`,
    )
      .bind(OUTER_WORKSPACE)
      .first<{ throughEventNumber: number }>()
  expect(await stored()).toEqual({
    throughEventNumber: summary.throughEventNumber,
  })
  expect((await markRead(0)).status).toBe(204)
  expect(await stored()).toEqual({
    throughEventNumber: summary.throughEventNumber,
  })
  expect(await stateFor()).toBe('ready')
  expect(await stateFor(active.cookies.memberCookie)).toBe('unread')
  runner.emit({
    type: 'assistant.delta',
    sessionId,
    turnId,
    messageId: 'late-answer',
    text: 'Late output',
  })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 4,
  })
  expect(await stateFor()).toBe('unread')
})
