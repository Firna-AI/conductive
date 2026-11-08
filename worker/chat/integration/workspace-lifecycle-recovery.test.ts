import { afterEach, beforeAll, expect, it } from 'vitest'

import { sessionPaths } from '../../../src/shared/sessions'
import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import { CLAUDE } from '../harness.test-support'
import { record, string } from '../inputs'
import { outerWorkerBundle } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import {
  FIRST_TURN_END,
  recoveryWorkspaceFixture,
  type RecoveryWorkspaceFixture,
} from './workspace-recovery.test-support'

let bundle: string
let fixture: RecoveryWorkspaceFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/workspace-recovery-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('repairs a confirmed turn end in the alarm after a deadline update fails', async () => {
  const active = (fixture = await recoveryWorkspaceFixture(bundle))
  const actor = await active.actor()
  active.boat.failDeadline = true
  active.runner.emit(FIRST_TURN_END)
  expect(await active.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 2,
  })
  await active.runner.closed
  expect(await actor.readChatWorkspaceSummary()).toMatchObject({
    working: false,
  })
  active.boat.failDeadline = false
  await actor.advanceStartAlarm(DEVICE_TEST_NOW + 4_999)
  expect(await actor.recoveryAdvanceRuns()).toBe(0)
  expect(await actor.recoveryAlarmAt()).toBe(DEVICE_TEST_NOW + 5_000)
  await actor.advanceStartAlarm(DEVICE_TEST_NOW + 5_000)
  expect(await actor.recoveryAdvanceRuns()).toBe(1)
  expect(await actor.recoveryAlarmAt()).toBe(DEVICE_TEST_NOW + 10_000)
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'ready',
    runningSessions: [],
  })
})

it('recovers before runner readiness after restart and keeps a newer same-session turn during late old ends', async () => {
  const active = (fixture = await recoveryWorkspaceFixture(bundle))
  active.boat.failDeadline = true
  active.runner.emit(FIRST_TURN_END)
  expect(await active.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 2,
  })
  await active.runner.closed
  active.boat.failDeadline = false
  await active.restart()
  const first = await active.connect('recovered-stream')
  expect(first.welcome).toMatchObject({ type: 'welcome', confirmedThrough: 0 })
  let actor = await active.actor()
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'ready',
    runningSessions: [],
    runnerConnected: false,
  })
  const sent = await active.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'newer-message',
        text: 'Continue with a new turn.',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(sent.status).toBe(202)
  first.runner.emit({ type: 'runner.ready' })
  expect(await first.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  const next = record(await first.runner.inbox.next())
  expect(next).toMatchObject({ type: 'turn', message: { id: 'newer-message' } })
  const nextTurnId = string(next.turnId)
  expect(nextTurnId).not.toBe('first-turn')
  await actor.readLifecycle()
  await active.restart()
  const second = await active.connect('late-old-end-stream')
  expect(second.welcome).toMatchObject({ type: 'welcome', confirmedThrough: 0 })
  actor = await active.actor()
  second.runner.emit(FIRST_TURN_END)
  expect(await second.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'working',
    runningSessions: ['first-session'],
    runnerConnected: false,
  })
  expect(await actor.credentialSender(nextTurnId)).toBe('owner')
  expect(await actor.readChatWorkspaceSummary()).toMatchObject({
    working: true,
  })
})

it('starts device cleanup when the confirmed turn-end lifecycle callback fails', async () => {
  const active = (fixture = await recoveryWorkspaceFixture(bundle))
  const actor = await active.actor()
  const mac = await active.connectMac()
  expect((await active.requestMacCommand('failed-lifecycle')).status).toBe(202)
  expect(await mac.inbox.next()).toMatchObject({
    type: 'command.request',
    request: { requestId: 'failed-lifecycle' },
  })
  expect(await actor.storedDeviceRequests()).toMatchObject([
    { state: 'waiting' },
  ])
  active.boat.failDeadline = true
  active.runner.emit(FIRST_TURN_END)
  expect(await active.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 2,
  })
  await active.runner.closed
  expect(await actor.storedDeviceRequests()).toMatchObject([
    {
      requestId: 'failed-lifecycle',
      state: 'failed',
      error: { code: 'turn_ended' },
    },
  ])
  expect(await mac.inbox.next()).toMatchObject({
    type: 'command.cancel',
    requestId: 'failed-lifecycle',
  })
})
