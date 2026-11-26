import { afterEach, beforeAll, expect, it } from 'vitest'
import { workspacePaths } from '../../src/shared/workspaces'
import { sessionsPath, sessionPaths } from '../../src/shared/sessions'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { RESTART_COMMAND } from '../lifecycle/software-restart'
import { heldOperation } from '../test-support/held-operation'
import {
  restart,
  servicesFixture,
  snapshot,
  type ServicesFixture,
} from './fixture.test-support'

let bundle: string
let fixture: ServicesFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

async function savedCatalogue(active: ServicesFixture) {
  return [...(await active.state())].filter(([key]) =>
    key.startsWith('services:v1:catalogue'),
  )
}

it('keeps the stored catalogue on a failed header Restart and ends a pending control as unconfirmed at disconnect', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const before = await savedCatalogue(active)
  const control = active.post(active.paths.control, restart)
  expect(record(await runner.inbox.next()).type).toBe('services.control')
  const held = heldOperation()
  active.boat.beforeCommand = async (command) => {
    if (command === RESTART_COMMAND) {
      await held.wait()
      active.boat.synchronousExitCode = 1
    }
  }
  const software = active.post(
    workspacePaths.restart(OUTER_ORG, OUTER_WORKSPACE),
    {},
  )
  try {
    await held.entered
    expect(await active.catalogue()).toMatchObject({ state: 'ready' })
    expect(await savedCatalogue(active)).toEqual(before)
    const state = JSON.stringify(
      [...(await active.state())].filter(([key]) =>
        key.startsWith('services:v1:control:'),
      ),
    )
    expect(state).toContain('\\"outcome\\":null')
  } finally {
    held.release()
  }
  const response = await software
  expect(response.status).toBe(502)
  expect(await response.json()).toMatchObject({
    error: { code: 'restart_failed' },
  })
  await runner.closed
  expect(await (await control).json()).toEqual({
    request: restart,
    outcome: { state: 'unconfirmed' },
  })
  expect(await savedCatalogue(active)).toEqual(before)
})

it('keeps service storage through header Restart and the automatic software restart', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const before = await savedCatalogue(active)
  const header = await active.post(
    workspacePaths.restart(OUTER_ORG, OUTER_WORKSPACE),
    {},
  )
  expect(header.status).toBe(200)
  expect(await savedCatalogue(active)).toEqual(before)
  const replacement = await active.connect()
  replacement.document('services.report.part', 'fresh', {
    ...snapshot,
    revision: 2,
  })
  await replacement.emit({ type: 'runner.ready' })
  const current = await savedCatalogue(active)
  const choice = { agent: 'claude', model: 'test-claude', effort: 'high' }
  const created = await active.post(sessionsPath(OUTER_ORG, OUTER_WORKSPACE), {
    choice,
  })
  expect(created.status).toBe(201)
  const sessionId = string(record(record(await created.json()).session).id)
  await closeSockets(replacement.socket)
  const sent = await active.post(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    {
      id: 'automatic-wait',
      text: 'Wait for the runner.',
      choice,
      attachmentIds: [],
    },
  )
  expect(sent.status).toBe(202)
  await active.actor().advanceStartAlarm(DEVICE_TEST_NOW + 180_000)
  expect(
    active.boat.commands.filter((command) => command === RESTART_COMMAND),
  ).toHaveLength(2)
  expect(await savedCatalogue(active)).toEqual(current)
})
