import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePaths } from '../../src/shared/workspaces'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { shellQuote } from '../lifecycle/commands'
import { localSavedScriptFixture } from '../lifecycle/saved-script-test-support'
import type { CommandResult } from '../sandbox/provider'
import {
  admitRetainedCreation,
  advanceRetainedCreation,
  completeRetainedCreation,
  deleteAndRestoreCreation,
  retainedCreationFixture,
  type RetainedCreationFixture,
} from './retained-creation.test-support'

let bundle: string
let fixture: RetainedCreationFixture | undefined
let local: Awaited<ReturnType<typeof localSavedScriptFixture>> | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/checkpoint-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  await local?.dispose()
  fixture = undefined
  local = undefined
})

it('rebuilds a restored runner-phase runtime after losing /run without repeating fetch or branch and still waits for runner readiness', async () => {
  const active = (fixture = await retainedCreationFixture(bundle))
  const sandbox = (local = await localSavedScriptFixture(OUTER_REPOSITORY))
  await active.env.DB.prepare(
    'UPDATE settings SET startup_script = ? WHERE org_id = ?',
  )
    .bind(
      `printf 'startup\\n' >> ${shellQuote(`${sandbox.directory}/startup-calls`)}`,
      OUTER_ORG,
    )
    .run()
  const results: CommandResult[] = []
  active.boat.beforeCommand = async (command, detached) => {
    if (!detached || !sandbox.contains(command, 'startup')) return
    const result = await sandbox.run(command)
    results.push(result)
    active.boat.commandExitCode = result.exitCode ?? -1
  }
  const { id } = await admitRetainedCreation(active)
  const original = await advanceRetainedCreation(active, id, 'runner')
  expect(results.map((result) => result.exitCode)).toEqual([0])
  expect(await sandbox.ready()).toBe('')
  expect((await sandbox.run('rm -rf -- /run/conductive')).exitCode).toBe(0)
  expect(await sandbox.ready()).toBeNull()
  await deleteAndRestoreCreation(active)
  const before = active.boat.commandRequests.length
  expect(
    (
      await active.request(workspacePaths.resume(OUTER_ORG, id), {
        method: 'POST',
        body: '{}',
      })
    ).status,
  ).toBe(200)
  await advanceRetainedCreation(active, id, 'runner')
  expect(
    active.boat.commandRequests
      .slice(before)
      .filter((request) => request.detached)
      .map((request) => request.command),
  ).toEqual([expect.stringContaining('/run/conductive/startup.sh')])
  expect(results.map((result) => result.exitCode)).toEqual([0, 0])
  expect(await sandbox.file('startup-calls')).toBe('startup\nstartup\n')
  expect(await sandbox.ready()).toBe('')
  expect(await sandbox.runnerCalls()).toBe(
    'runner-restarted\nrunner-restarted\n',
  )
  expect(await active.actor(id).readCreationLifecycleResult()).toBeUndefined()
  expect(await active.actor(id).readLifecycle()).toMatchObject({
    state: 'starting',
    runnerConnected: false,
    startupPrepared: false,
  })
  expect(await completeRetainedCreation(active, id)).toEqual({ ok: true })
  expect(await active.actor(id).readLifecycle()).toMatchObject({
    startupPrepared: true,
  })
  expect(active.boat.starts).toHaveLength(1)
  expect(active.boat.resumeIds).toEqual([original.allocatedSandboxId])
  expect(active.boat.deletedIds).toEqual([])
})
