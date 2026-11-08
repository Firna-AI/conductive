import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePaths } from '../../../src/shared/workspaces'
import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import { array } from '../agent-events'
import { record } from '../inputs'
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

it('retries a failed title publication after the original idle stop and then allows resume', async () => {
  const active = (fixture = await recoveryWorkspaceFixture(bundle))
  const actor = await active.actor()
  active.runner.emit(FIRST_TURN_END)
  expect(await active.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 2,
  })
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'ready',
    lastActivityAt: DEVICE_TEST_NOW,
    runningSessions: [],
  })
  const before = (await actor.readChatWorkspaceSummary()).throughEventNumber
  await active.env.DB.prepare(
    `CREATE TRIGGER fail_idle_title BEFORE UPDATE OF name ON workspaces
     WHEN NEW.id = '${OUTER_WORKSPACE}'
     BEGIN SELECT RAISE(ABORT, 'idle title write failed'); END`,
  ).run()
  active.runner.emit({ type: 'workspace.title', name: 'The idle title' })
  expect(await active.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 3,
  })
  await active.runner.closed
  const connected = await active.connect('idle-title-stream')
  expect(connected.welcome).toMatchObject({
    type: 'welcome',
    confirmedThrough: 0,
  })
  const idleAt = DEVICE_TEST_NOW + 1_800_000
  await actor.advanceStartAlarm(idleAt)
  expect(await actor.recoveryAdvanceRuns()).toBe(1)
  expect(await actor.recoveryAlarmAt()).toBe(idleAt + 30_000)
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'stopped',
    lastActivityAt: DEVICE_TEST_NOW,
    stoppedAt: idleAt,
    runningSessions: [],
  })
  expect(active.boat.stopIds).toEqual(['bx_lifecycle'])
  expect(
    await active.env.DB.prepare(
      'SELECT state, name FROM workspaces WHERE id = ?',
    )
      .bind(OUTER_WORKSPACE)
      .first(),
  ).toEqual({ state: 'ready', name: 'workspace one' })
  expect(await actor.recoveryAlarmAt()).toBe(idleAt + 30_000)
  await active.env.DB.prepare('DROP TRIGGER fail_idle_title').run()
  await actor.advanceStartAlarm(idleAt + 30_000)
  expect(await actor.recoveryAdvanceRuns()).toBe(1)
  expect(await actor.recoveryAlarmAt()).toBe(idleAt + 1_123_200_000)
  expect(
    await active.env.DB.prepare(
      'SELECT state, name FROM workspaces WHERE id = ?',
    )
      .bind(OUTER_WORKSPACE)
      .first(),
  ).toEqual({ state: 'stopped', name: 'The idle title' })
  expect(await actor.readLifecycle()).toMatchObject({
    lastActivityAt: DEVICE_TEST_NOW,
    stoppedAt: idleAt,
  })
  const replay = await active.browser(before)
  expect(
    array(replay.history.events, record)
      .map((envelope) => record(envelope.event))
      .filter((event) => event.type === 'workspace.updated')
      .map((event) => record(event.workspace)),
  ).toMatchObject([{ state: 'stopped', name: 'The idle title' }])
  const resuming = await active.request(
    workspacePaths.resume(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: '{}' },
  )
  expect(resuming.status).toBe(200)
  expect(await resuming.json()).toMatchObject({
    workspace: { state: 'starting' },
  })
  expect(await actor.readStartCheckpoint()).toMatchObject({ kind: 'resume' })
})
