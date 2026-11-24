import { expect } from 'vitest'

import { requireFeatureResult } from '../features/result'
import type { backendFixture } from './backend-test-support'
import { startRetryFixture } from './retry-test-support'
import {
  RESTART_COMMAND,
  restartWorkspaceSoftware,
  UPDATE_CHECK_COMMAND,
} from './software-restart'
import { advanceToRunner } from './start-resume-test-support'

/** A created workspace whose runner is ready, as after a normal start. */
export async function readyWorkspace(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
) {
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
  const restartCommands = (commands: readonly string[]) =>
    commands.filter(
      (command) =>
        command === UPDATE_CHECK_COMMAND || command === RESTART_COMMAND,
    )
  return {
    fixture,
    actor,
    workspaceId,
    restart,
    lifecycle,
    commands: () => restartCommands(fixture.boat.commands),
    hostCommands: () => restartCommands(fixture.host.commands),
  }
}
