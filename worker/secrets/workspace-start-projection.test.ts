import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePaths } from '../../src/shared/workspaces'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { number, record } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import {
  driveWorkspaceStart,
  prepareWorkspaceStart,
} from '../chat/integration/workspace-start.test-support'
import { readWorkspace } from '../lifecycle/workspace-data'
import { providerForAccount } from '../sandbox/client'
import { secretFixture, type SecretFixture } from './requests.test-support'

let bundle: string
let fixture: SecretFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/secrets/requests-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

function observeProjection(
  active: SecretFixture,
  tab: Awaited<ReturnType<SecretFixture['browser']>>,
) {
  let throughEventNumber = number(tab.history.throughEventNumber)
  let published: unknown
  return async () => {
    const summary = await active.actor().readChatWorkspaceSummary()
    while (throughEventNumber < summary.throughEventNumber) {
      const message = record(await tab.inbox.next())
      if (message.type !== 'event') continue
      const envelope = record(message.envelope)
      const event = record(envelope.event)
      if (event.type === 'workspace.updated')
        published = record(event.workspace).state
      throughEventNumber = number(envelope.eventNumber)
    }
    const workspace = await readWorkspace(
      active.env.DB,
      OUTER_ORG,
      OUTER_WORKSPACE,
    )
    return { stored: workspace.state, published }
  }
}

it('publishes Starting through Restart with an unanswered secret request and restores Needs input when the runner is ready', async () => {
  const active = (fixture = await secretFixture(bundle))
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  expect((await active.listRequests()).requests[0]).toMatchObject({
    id: pending.request.id,
    state: 'waiting',
  })
  const tab = await active.browser()
  const projection = observeProjection(active, tab)
  const restarted = await active.request(
    workspacePaths.restart(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: '{}' },
  )
  expect(restarted.status).toBe(200)
  expect(await restarted.json()).toEqual({ updateCheck: 'ok' })
  const duringRestart = await projection()

  await active.finish()
  expect((await active.listRequests()).requests[0]).toMatchObject({
    id: pending.request.id,
    state: 'late',
    late: true,
  })
  expect(await (await pending.response).json()).toMatchObject({
    status: 'pending',
  })
  const afterTurnEnd = await projection()
  await closeSockets(active.runner.socket)
  await active.runner.closed
  const connected = await requestRunner(active)
  expect(connected.status).toBe(101)
  const socket = connected.webSocket
  if (!socket) throw new Error('The restarted runner socket is missing.')
  try {
    const runner = new OuterFakeRunner(socket, undefined, {
      streamId: 'unanswered-request-restart',
    })
    expect(await runner.inbox.next()).toMatchObject({ type: 'welcome' })
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toMatchObject({ type: 'confirm' })
    const afterReady = await projection()

    expect({ duringRestart, afterTurnEnd, afterReady }).toEqual({
      duringRestart: { stored: 'starting', published: 'starting' },
      afterTurnEnd: { stored: 'starting', published: 'starting' },
      afterReady: { stored: 'input', published: 'input' },
    })
    expect((await active.listRequests()).requests[0]).toMatchObject({
      id: pending.request.id,
      state: 'late',
      late: true,
      answeredBy: null,
      endedBy: null,
      notice: null,
    })
  } finally {
    await closeSockets(socket)
  }
})

it('publishes Starting on Resume with an unanswered late request and restores Needs input when the runner is ready', async () => {
  const active = (fixture = await secretFixture(bundle))
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.finish()
  expect((await active.listRequests()).requests[0]).toMatchObject({
    id: pending.request.id,
    state: 'late',
    late: true,
  })
  expect(await (await pending.response).json()).toMatchObject({
    status: 'pending',
  })
  const actor = await active.secretActor()
  const workspace = await readWorkspace(
    active.env.DB,
    OUTER_ORG,
    OUTER_WORKSPACE,
  )
  if (!workspace.sandboxId) throw new Error('The cloud computer is missing.')
  await providerForAccount(
    active.env,
    active.boat.fetch,
    workspace.providerAccount,
  ).stop(workspace.sandboxId)
  await closeSockets(active.runner.socket)
  await actor.lifecycleStopped()
  await active.runner.closed
  expect(
    (await readWorkspace(active.env.DB, OUTER_ORG, OUTER_WORKSPACE)).state,
  ).toBe('stopped')

  const tab = await active.browser()
  const projection = observeProjection(active, tab)
  const resumed = await active.request(
    workspacePaths.resume(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: '{}' },
  )
  expect(resumed.status).toBe(200)
  const reply = record(await resumed.json())
  const duringResume = await projection()
  await prepareWorkspaceStart(actor)
  const connected = await requestRunner(active)
  expect(connected.status).toBe(101)
  const socket = connected.webSocket
  if (!socket) throw new Error('The resumed runner socket is missing.')
  try {
    const runner = new OuterFakeRunner(socket, undefined, {
      streamId: 'unanswered-request-resume',
    })
    expect(await runner.inbox.next()).toMatchObject({ type: 'welcome' })
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toMatchObject({ type: 'confirm' })
    expect(
      await driveWorkspaceStart(
        actor,
        (async () => actor.waitLifecycleStart())(),
      ),
    ).toEqual({ ok: true })
    const afterReady = await projection()

    expect({
      reply: record(reply.workspace).state,
      duringResume,
      afterReady,
    }).toEqual({
      reply: 'starting',
      duringResume: { stored: 'starting', published: 'starting' },
      afterReady: { stored: 'input', published: 'input' },
    })
    expect((await active.listRequests()).requests[0]).toMatchObject({
      id: pending.request.id,
      state: 'late',
      late: true,
      answeredBy: null,
      endedBy: null,
      notice: null,
    })
  } finally {
    await closeSockets(socket)
  }
})
