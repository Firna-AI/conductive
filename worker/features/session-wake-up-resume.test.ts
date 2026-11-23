import { afterEach, beforeAll, expect, it } from 'vitest'

import { agentWakeUpPaths } from '../../src/shared/wake-up-paths'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { CLAUDE } from '../chat/harness.test-support'
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
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import type { WorkspaceStartResult } from '../lifecycle/start-types'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'
import {
  endCallingTurn,
  getTool,
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

async function readyComputer(active: AgentWriteFixture, sandbox: string) {
  const actor = await active.actor()
  await active.env.DB.prepare(
    'UPDATE workspace_runtime SET created_by_user_id = ?, session_id = ?, first_turn_id = ?, first_message_id = ? WHERE workspace_id = ?',
  )
    .bind(
      'member',
      active.sourceSessionId,
      active.sourceTurnId,
      'member-starting-message',
      OUTER_WORKSPACE,
    )
    .run()
  await setSandbox(active, sandbox)
  active.boat.states.set(sandbox, 'running')
  await actor.initializeLifecycle({
    workspaceId: OUTER_WORKSPACE,
    orgId: OUTER_ORG,
    firstMessage: {
      id: 'member-starting-message',
      text: 'Start this turn',
      choice: CLAUDE,
      attachmentIds: [],
    },
    firstTurn: {
      sessionId: active.sourceSessionId,
      turnId: active.sourceTurnId,
      senderUserId: 'member',
    },
  })
  await actor.beginLifecycleStart('create')
  await actor.lifecyclePrepared()
  await actor.reportRunnerLifecycle({ type: 'runner.ready' })
  await actor.acknowledgeLifecycleFirstMessage()
  return actor
}

it('keeps the wake-up through an idle stop and retries one accepted message on resume', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const sandbox = 'bx_wake_up'
  const actor = await readyComputer(active, sandbox)
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
  const messageId = `session-wake-up:${wakeUp.id}`
  expect(fired).toMatchObject({ wakeUpId: wakeUp.id, messageId })
  expect(active.boat.resumeIds).toEqual([])

  await setSandbox(active, sandbox)
  await actor.advanceStartAlarm(at + 30_000)
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'starting',
    start: { kind: 'resume' },
  })
  await prepareWorkspaceStart(actor)
  const connected = await requestRunner(active)
  if (!connected.webSocket || !fired)
    throw new Error('The resumed turn is missing.')
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
        id: messageId,
        text: 'Wake-up: Check the result after idle',
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
