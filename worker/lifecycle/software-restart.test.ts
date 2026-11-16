import { expect, it } from 'vitest'

import { requireFeatureResult } from '../features/result'
import { HttpError } from '../http'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE_RESTART_LIMIT_MS } from './durable-restart'
import { startRetryFixture } from './retry-test-support'
import {
  RESTART_COMMAND,
  restartWorkspaceSoftware,
  UPDATE_CHECK_COMMAND,
} from './software-restart'
import { advanceToRunner } from './start-resume-test-support'

const fixtureForTest = setupBackendTests()

/** A created workspace whose runner is ready, as after a normal start. */
async function readyWorkspace() {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  await advanceToRunner(start)
  const job = await start.job()
  if (!job) throw new Error('The start job is missing.')
  const actor = fixture.actors.get(job.workspaceId)
  if (!actor) throw new Error('The workspace actor is missing.')
  await actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  await start.tick(fixture.runtime.dependencies.now())
  expect(await start.wait()).toEqual({ ok: true })
  expect((await start.endpoint.readLifecycle())?.state).toBe('ready')
  const workspaceId = job.workspaceId
  const restart = (userId = fixture.user.id) =>
    restartWorkspaceSoftware({
      env: fixture.runtime.env,
      dependencies: fixture.runtime.dependencies,
      orgId: fixture.org.id,
      workspaceId,
      userId,
      step: async (step) => {
        requireFeatureResult(
          await actor.native.api.lifecycleRpc.softwareRestart(
            workspaceId,
            step,
          ),
        )
      },
    })
  const lifecycle = () => start.endpoint.readLifecycle()
  const commands = () =>
    fixture.boat.commands.filter(
      (command) =>
        command === UPDATE_CHECK_COMMAND || command === RESTART_COMMAND,
    )
  return { fixture, actor, workspaceId, restart, lifecycle, commands }
}

async function refusal(operation: Promise<unknown>): Promise<HttpError> {
  const error: unknown = await operation.catch((caught: unknown) => caught)
  if (!(error instanceof HttpError)) throw new Error('Expected a refusal.')
  return error
}

it('checks for updates, restarts the runner and the relay, and shows Starting until the runner is ready', async () => {
  const { actor, restart, lifecycle, commands } = await readyWorkspace()
  expect(await restart()).toEqual({ updateCheck: 'ok' })
  expect(commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect(await lifecycle()).toMatchObject({ state: 'starting' })
  expect((await lifecycle())?.softwareRestartAt).toBeTypeOf('number')
  await actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  const ready = await lifecycle()
  expect(ready).toMatchObject({ state: 'ready', error: null })
  expect(ready?.softwareRestartAt).toBeUndefined()
})

it('restarts with the installed software when the update check fails', async () => {
  const { fixture, restart, lifecycle, commands } = await readyWorkspace()
  fixture.boat.beforeCommand = async (command) => {
    fixture.boat.synchronousExitCode = command === UPDATE_CHECK_COMMAND ? 1 : 0
  }
  expect(await restart()).toEqual({ updateCheck: 'failed' })
  expect(commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect((await lifecycle())?.state).toBe('starting')
})

it('shows the error state with Try again when the restart command fails', async () => {
  const { fixture, restart, lifecycle } = await readyWorkspace()
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
})

it('ends a restart whose runner is not ready within the time limit', async () => {
  const { fixture, workspaceId, restart, lifecycle } = await readyWorkspace()
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
  const { fixture, workspaceId, restart, commands } = await readyWorkspace()
  await restart()
  const busy = await refusal(restart())
  expect([busy.status, busy.code]).toEqual([409, 'workspace_not_running'])
  expect(commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
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
