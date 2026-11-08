import { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspaceEventsPath } from '../../../src/shared/events'
import { registerCreationAttempt } from '../../lifecycle/creation-attempt-data'
import { deleteProvisionalWorkspace } from '../../lifecycle/workspace-data'
import { array } from '../agent-events'
import { record } from '../inputs'
import { outerWorkerBundle } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import { createLifecycleChatFixture } from './workspace-lifecycle.test-support'

let bundle: string
let fixture: Awaited<ReturnType<typeof createLifecycleChatFixture>> | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('replays every retained history page of a removed failed create only to its sender before closing', async () => {
  const active = (fixture = await createLifecycleChatFixture(bundle))
  await registerCreationAttempt(active.env.DB, {
    id: OUTER_WORKSPACE,
    orgId: OUTER_ORG,
    senderUserId: 'owner',
    messageId: 'first-message',
    now: 1_800_000_000_000,
  })
  await active.initialize()
  const actor = active.actor()
  await actor.beginLifecycleStart('create')
  for (let step = 0; step < 40; step++)
    await actor.lifecycleStep(`step-${step}`, `Start step ${step}`, 'completed')
  const error = {
    code: 'workspace_start_failed',
    message: 'The start failed.',
    log: null,
  }
  await actor.retainLifecycleFailedCreation(error)
  await actor.lifecycleFailed(error)
  const through = (await actor.readChatWorkspaceSummary()).throughEventNumber
  await actor.clearLifecycle()
  await deleteProvisionalWorkspace(active.env.DB, OUTER_ORG, OUTER_WORKSPACE)
  const path = workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE)
  const refused = await active.request(path, {
    headers: { Upgrade: 'websocket', Cookie: active.cookies.memberCookie },
  })
  expect(refused.status).toBe(404)
  const response = await active.request(path, {
    headers: { Upgrade: 'websocket' },
  })
  expect(response.status).toBe(101)
  const socket = response.webSocket
  if (!socket) throw new Error('The failed-create replay socket is missing.')
  const frames: unknown[] = []
  socket.addEventListener('message', (message) => {
    if (typeof message.data !== 'string')
      throw new Error('A text replay frame is required.')
    const value: unknown = JSON.parse(message.data)
    frames.push(value)
  })
  const closed = new Promise<void>((resolve) => {
    socket.addEventListener(
      'close',
      () => {
        if (socket.readyState === WebSocket.READY_STATE_CLOSING)
          socket.close(1000, 'Connection closed.')
        resolve()
      },
      { once: true },
    )
  })
  socket.accept()
  await closed
  const histories = frames.map((frame) => record(record(frame).history))
  const envelopes = histories.flatMap((history) =>
    array(history.events, record),
  )
  expect(envelopes.map((envelope) => envelope.eventNumber)).toEqual(
    Array.from({ length: through }, (_unused, index) => index + 1),
  )
  expect(histories.map((history) => history.throughEventNumber)).toEqual(
    histories.map(() => through),
  )
  expect(envelopes.at(-2)).toMatchObject({
    event: { type: 'workspace.updated', workspace: { state: 'error' } },
  })
  expect(envelopes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event: {
          type: 'message.accepted',
          message: expect.objectContaining({ id: 'first-message' }),
        },
      }),
    ]),
  )
})
