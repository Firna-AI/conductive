import { expect, it } from 'vitest'

import { HttpError } from '../http'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE_RESTART_LIMIT_MS } from './durable-restart'
import { IDLE_MS } from './durable-types'
import { RESTART_COMMAND, UPDATE_CHECK_COMMAND } from './software-restart'
import { readyWorkspace } from './software-restart.test-support'
import { workspaceMachineOwner } from '../machines/client'
import { machineTokenStatus } from '../machines/token.test-support'
import { record, string } from '../chat/inputs'

const fixtureForTest = setupBackendTests()

async function refusal(operation: Promise<unknown>): Promise<HttpError> {
  const error: unknown = await operation.catch((caught: unknown) => caught)
  if (!(error instanceof HttpError)) throw new Error('Expected a refusal.')
  return error
}

it('checks for updates, restarts the runner and the relay, and shows Starting until the runner is ready', async () => {
  const { actor, restart, lifecycle, commands, hostCommands } =
    await readyWorkspace(fixtureForTest())
  expect(await restart()).toEqual({ updateCheck: 'ok' })
  expect(commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect(hostCommands()).toEqual(commands())
  expect(await lifecycle()).toMatchObject({ state: 'starting' })
  expect((await lifecycle())?.softwareRestartAt).toBeTypeOf('number')
  await actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  const ready = await lifecycle()
  expect(ready).toMatchObject({ state: 'ready', error: null })
  expect(ready?.softwareRestartAt).toBeUndefined()
})

it('restarts with the installed software when the update check fails', async () => {
  const { fixture, restart, lifecycle, commands, hostCommands } =
    await readyWorkspace(fixtureForTest())
  fixture.boat.beforeCommand = async (command) => {
    fixture.boat.synchronousExitCode = command === UPDATE_CHECK_COMMAND ? 1 : 0
  }
  expect(await restart()).toEqual({ updateCheck: 'failed' })
  expect(commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect(hostCommands()).toEqual(commands())
  expect((await lifecycle())?.state).toBe('starting')
})

it('shows the error state with Try again when the restart command fails, and still stops when idle', async () => {
  const { fixture, workspaceId, restart, lifecycle } =
    await readyWorkspace(fixtureForTest())
  const token = string(
    record(fixture.boat.starts[0].env).CONDUCTIVE_MACHINE_TOKEN,
  )
  const owner = workspaceMachineOwner(fixture.org.id, workspaceId)
  await fixture.host.disconnect('bx_1')
  expect(await machineTokenStatus(fixture.harness.env, owner, token)).toBe(101)
  await fixture.host.connect('bx_1')
  fixture.boat.synchronousExitCode = 1
  const error = await refusal(restart())
  expect([error.status, error.code]).toEqual([502, 'restart_failed'])
  expect(await lifecycle()).toMatchObject({
    state: 'error',
    error: {
      code: 'restart_failed',
      message: "The software didn't restart. Try again.",
    },
  })
  expect((await lifecycle())?.softwareRestartAt).toBeUndefined()
  // The cloud computer still runs for Try again, and it keeps its idle stop.
  expect(fixture.boat.stopIds).toEqual([])
  expect(await machineTokenStatus(fixture.harness.env, owner, token)).toBe(101)
  const idleAt = ((await lifecycle())?.lastActivityAt ?? 0) + IDLE_MS
  await fixture.advanceTo(idleAt, workspaceId)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  expect((await lifecycle())?.state).toBe('stopped')
  expect(await machineTokenStatus(fixture.harness.env, owner, token)).toBe(401)
})

it('ends a restart whose runner is not ready within the time limit', async () => {
  const { fixture, workspaceId, restart, lifecycle } =
    await readyWorkspace(fixtureForTest())
  await restart()
  const startedAt = (await lifecycle())?.softwareRestartAt ?? 0
  await fixture.advanceTo(
    startedAt + SOFTWARE_RESTART_LIMIT_MS - 1_000,
    workspaceId,
  )
  expect((await lifecycle())?.state).toBe('starting')
  await fixture.advanceTo(startedAt + SOFTWARE_RESTART_LIMIT_MS, workspaceId)
  expect(await lifecycle()).toMatchObject({
    state: 'error',
    error: { code: 'restart_failed' },
  })
})

it('refuses a workspace that does not run, an archived one, and a person outside the org', async () => {
  const { fixture, workspaceId, restart, commands, hostCommands } =
    await readyWorkspace(fixtureForTest())
  await restart()
  const busy = await refusal(restart())
  expect([busy.status, busy.code]).toEqual([409, 'workspace_not_running'])
  expect(commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect(hostCommands()).toEqual(commands())
  const outsider = await refusal(restart('user-outside'))
  expect(outsider.status).toBe(404)
  await fixture.runtime.env.DB.prepare(
    'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
  )
    .bind(workspaceId)
    .run()
  const archived = await refusal(restart())
  expect([archived.status, archived.code]).toEqual([
    409,
    'workspace_not_running',
  ])
  expect(commands()).toHaveLength(2)
})
