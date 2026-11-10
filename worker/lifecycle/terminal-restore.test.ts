import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePaths } from '../../src/shared/workspaces'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  admitRetainedCreation,
  advanceRetainedCreation,
  completeRetainedCreation,
  deleteAndRestoreCreation,
  retainedCreationFixture,
  retainedCreationJob,
  type RetainedCreationFixture,
} from '../features/retained-creation.test-support'
import { terminalPassword } from '../terminal/credentials'

let bundle: string
let fixture: RetainedCreationFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/checkpoint-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('rebuilds the startup runtime of a retained terminal checkpoint after Restore without repeating repository commands', async () => {
  const active = (fixture = await retainedCreationFixture(bundle))
  const { id } = await admitRetainedCreation(active)
  await advanceRetainedCreation(active, id, 'startup')
  for (let step = 0; step < 4; step++)
    await active.actor(id).advanceStartAlarm()
  const original = await retainedCreationJob(active, id)
  expect(original).toMatchObject({ phase: 'terminal-password' })
  expect(active.boat.fileReads).toEqual([])
  await deleteAndRestoreCreation(active)
  const before = active.boat.commandRequests.length
  active.boat.terminalPassword = 'c'.repeat(64)
  const resumed = await active.request(workspacePaths.resume(OUTER_ORG, id), {
    method: 'POST',
    body: '{}',
  })
  expect(resumed.status).toBe(200)
  await advanceRetainedCreation(active, id, 'runner')
  expect(active.boat.commandRequests.slice(before)).toMatchObject([
    {
      detached: true,
      command: expect.stringContaining('/run/conductive/startup.sh'),
    },
    {
      detached: true,
      command: expect.stringContaining(
        'systemctl start conductive-terminal.service',
      ),
    },
  ])
  expect(await active.actor(id).readCreationLifecycleResult()).toBeUndefined()
  expect(await completeRetainedCreation(active, id)).toEqual({ ok: true })
  expect(await active.actor(id).readLifecycle()).toMatchObject({
    state: 'working',
    startupPrepared: true,
  })
  expect(
    await terminalPassword(active.env, id, String(original.allocatedSandboxId)),
  ).toBe('c'.repeat(64))
  expect(active.boat.starts).toHaveLength(1)
  expect(active.boat.deletedIds).toEqual([])
})
