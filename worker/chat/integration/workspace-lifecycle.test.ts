import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { chatHistoryPath } from '../../../src/shared/events'
import { sessionPaths } from '../../../src/shared/sessions'
import { closeSockets } from '../adapter-sockets.test-support'
import { CLAUDE } from '../harness.test-support'
import { record, string } from '../inputs'
import { outerWorkerBundle } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import { requestRunner, OuterFakeRunner } from './runner-socket.test-support'
import { createLifecycleChatFixture } from './workspace-lifecycle.test-support'

let bundle: string
let fixture: Awaited<ReturnType<typeof createLifecycleChatFixture>> | undefined
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

it('joins runner readiness, reconnect, confirmed stop and the next queued turn without reentering the chat queue', async () => {
  const active = (fixture = await createLifecycleChatFixture(bundle))
  await active.initialize()
  await active.actor().beginLifecycleStart('create')
  const connected = await requestRunner(active)
  expect(connected.status).toBe(101)
  const socket = connected.webSocket
  if (!socket) throw new Error('The runner socket is missing.')
  sockets.push(socket)
  const runner = new OuterFakeRunner(socket)
  expect(await runner.inbox.next()).toMatchObject({
    type: 'welcome',
    confirmedThrough: 0,
  })
  runner.emit({ type: 'runner.ready' })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  expect(await active.actor().readLifecycle()).toMatchObject({
    state: 'starting',
    runnerConnected: true,
    runningSessions: [],
  })
  expect(await active.actor().readChatWorkspaceSummary()).toMatchObject({
    working: false,
  })
  await active.actor().lifecyclePrepared()
  expect(await active.actor().readLifecycle()).toMatchObject({
    state: 'working',
    runnerConnected: true,
    runningSessions: ['first-session'],
    pendingFirstMessage: null,
  })
  const turn = record(await runner.inbox.next())
  expect(turn).toMatchObject({
    type: 'turn',
    sessionId: 'first-session',
    turnId: 'first-turn',
    message: { id: 'first-message' },
    login: { secret: 'outer-secret-owner' },
  })
  expect(await active.actor().credentialSender('first-turn')).toBe('owner')
  await closeSockets(socket)
  expect(await active.actor().readLifecycle()).toMatchObject({
    runnerConnected: false,
  })
  const reconnected = await requestRunner(active)
  expect(reconnected.status).toBe(101)
  const second = reconnected.webSocket
  if (!second) throw new Error('The reconnected runner socket is missing.')
  sockets.push(second)
  const resumed = new OuterFakeRunner(second)
  expect(await resumed.inbox.next()).toMatchObject({
    type: 'welcome',
    confirmedThrough: 1,
  })
  expect(await resumed.inbox.next()).toMatchObject({
    type: 'turn',
    commandId: turn.commandId,
    turnId: 'first-turn',
  })
  expect(await active.actor().readLifecycle()).toMatchObject({
    runnerConnected: true,
    state: 'working',
  })
  await active.actor().lifecycleStopped()
  expect(await resumed.closed).toEqual({
    code: 1000,
    reason: 'Connection closed.',
  })
  expect(await active.actor().readLifecycle()).toMatchObject({
    state: 'stopped',
    runningSessions: [],
    runnerConnected: false,
  })
  expect(await active.actor().credentialSender('first-turn')).toBeNull()
  const stopped = await active.request(
    chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
  )
  expect(stopped.status).toBe(200)
  expect(await stopped.json()).toMatchObject({
    events: expect.arrayContaining([
      expect.objectContaining({
        event: expect.objectContaining({
          type: 'turn.completed',
          turnId: 'first-turn',
          state: 'stopped',
        }),
      }),
      expect.objectContaining({
        event: expect.objectContaining({
          type: 'session.updated',
          session: expect.objectContaining({
            id: 'first-session',
            activeTurnId: null,
          }),
        }),
      }),
    ]),
  })
  const queued = await active.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'after-stop',
        text: 'Continue after resume',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(queued.status).toBe(202)
  await active.actor().beginLifecycleStart('resume')
  await active.actor().lifecyclePrepared()
  const afterStop = await requestRunner(active)
  expect(afterStop.status).toBe(101)
  const third = afterStop.webSocket
  if (!third) throw new Error('The resumed runner socket is missing.')
  sockets.push(third)
  const next = new OuterFakeRunner(third)
  expect(await next.inbox.next()).toMatchObject({
    type: 'welcome',
    confirmedThrough: 1,
  })
  const command = record(await next.inbox.next())
  expect(command).toMatchObject({
    type: 'turn',
    sessionId: 'first-session',
    message: { id: 'after-stop' },
  })
  expect(string(command.turnId)).not.toBe('first-turn')
})
