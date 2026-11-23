import { afterEach, beforeAll, expect, it } from 'vitest'

import { agentWakeUpPaths } from '../../src/shared/wake-up-paths'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import {
  driveWorkspaceStart,
  prepareWorkspaceStart,
} from '../chat/integration/workspace-start.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { IDLE_MS, LIFECYCLE_STATE_KEY } from '../lifecycle/durable-types'
import type { WorkspaceStartResult } from '../lifecycle/start-types'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'
import {
  endCallingTurn,
  getTool,
  readyWakeCaller,
  scheduleWakeUp,
  wakeUpEvents,
} from './session-wake-up.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

function setSandbox(active: AgentWriteFixture, id: string | null) {
  return active.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind(id, OUTER_WORKSPACE)
    .run()
}

it('keeps the wake-up through an idle stop and retries one accepted message on resume', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const sandbox = 'bx_wake_up'
  const actor = await readyWakeCaller(active, sandbox)
  const idleAt = DEVICE_TEST_NOW + 30 * 60_000
  const at = idleAt + 60_000
  const { wakeUp } = await scheduleWakeUp(active, {
    at,
    text: 'Check the result after idle',
  })
  await endCallingTurn(active)
  await actor.advanceStartAlarm(idleAt)
  expect(await actor.readLifecycle()).toMatchObject({ state: 'stopped' })
  expect(active.boat.stopIds).toEqual([sandbox])
  const list = await getTool(
    active,
    agentWakeUpPaths.list(undefined, active.sourceSessionId),
  )
  expect(await list.json()).toMatchObject({ wakeUps: [wakeUp] })

  await setSandbox(active, null)
  await actor.advanceStartAlarm(at)
  const fired = (await wakeUpEvents(active)).find(
    (event) => event.type === 'session.wake-up-fired',
  )
  if (!fired) throw new Error('The fired wake-up is missing.')
  expect(fired.wakeUpId).toBe(wakeUp.id)
  expect(active.boat.resumeIds).toEqual([])

  await setSandbox(active, sandbox)
  await actor.advanceStartAlarm(at + 30_000)
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'starting',
    start: { kind: 'resume' },
  })
  await prepareWorkspaceStart(actor)
  const connected = await requestRunner(active)
  if (!connected.webSocket) throw new Error('The resumed turn is missing.')
  try {
    const runner = new OuterFakeRunner(connected.webSocket, OUTER_WORKSPACE, {
      streamId: 'wake-up-resume',
    })
    await runner.inbox.next()
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toMatchObject({
      type: 'confirm',
      throughEventNumber: 1,
    })
    expect(
      await driveWorkspaceStart<WorkspaceStartResult<unknown>>(
        actor,
        actor.waitLifecycleStart(),
      ),
    ).toEqual({ ok: true })
    const command = await runner.waitForTurn(fired.turnId)
    expect(command).toMatchObject({
      type: 'turn',
      sessionId: active.sourceSessionId,
      wakeUp: true,
      message: {
        id: fired.messageId,
        text: 'Wake-up:\n\nCheck the result after idle',
        sender: { id: 'member' },
      },
    })
    expect(await wakeUpEvents(active)).toEqual([
      {
        type: 'session.wake-up-scheduled',
        sessionId: active.sourceSessionId,
        wakeUp,
      },
      fired,
    ])
    expect(active.boat.resumeIds).toEqual([sandbox])
  } finally {
    await closeSockets(connected.webSocket)
  }
})

it('retries a scheduled wake-up after an unconfirmed idle stop settles', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const sandbox = 'bx_wake_up'
  const actor = await readyWakeCaller(active, sandbox)
  const idleAt = DEVICE_TEST_NOW + IDLE_MS
  const at = idleAt + 5_000
  const { wakeUp } = await scheduleWakeUp(active, {
    at,
    text: 'Check after idle',
  })
  await endCallingTurn(active)
  active.boat.stopReplyState = 'archiving'
  await actor.advanceStartAlarm(idleAt)
  await closeSockets(active.sourceRunner.socket)
  await actor.inspectFeatureConnections()
  expect(active.boat.stopIds).toEqual([sandbox])
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'ready',
    runnerConnected: false,
  })
  await actor.advanceStartAlarm(at)
  const events = await wakeUpEvents(active)
  expect(events).toMatchObject([
    { type: 'session.wake-up-scheduled' },
    { type: 'session.wake-up-fired', wakeUpId: wakeUp.id },
  ])
  expect(active.boat.resumeIds).toEqual([])

  active.boat.states.set(sandbox, 'archived')
  active.boat.stopReplyState = 'archived'
  await actor.advanceStartAlarm(at + 30_000)
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'starting',
    start: { kind: 'resume' },
  })
  expect(await wakeUpEvents(active)).toEqual(events)
})

it('retains a scheduled wake-up after lifecycle admission refuses its resume', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const sandbox = 'bx_wake_up'
  const actor = await readyWakeCaller(active, sandbox)
  const at = DEVICE_TEST_NOW + 60_000
  await scheduleWakeUp(active, { at, text: 'Check after the pending stop' })
  await endCallingTurn(active)
  await closeSockets(active.sourceRunner.socket)
  await actor.inspectFeatureConnections()
  await actor.lifecycleStopped()
  const stopped = await actor.readLifecycle()
  if (!stopped) throw new Error('The lifecycle state is missing.')
  active.boat.stopReplyState = 'archiving'
  active.boat.states.set(sandbox, 'archiving')
  await actor.seedFeatureState({
    [LIFECYCLE_STATE_KEY]: { ...stopped, startStop: 'pending' },
  })
  await actor.advanceStartAlarm(at)
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'stopped',
    startStop: 'pending',
  })
  expect(active.boat.resumeIds).toEqual([])

  active.boat.states.set(sandbox, 'archived')
  active.boat.stopReplyState = 'archived'
  await actor.lifecycleStopped()
  await actor.advanceStartAlarm(at + 30_000)
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'starting',
    start: { kind: 'resume' },
  })
})
