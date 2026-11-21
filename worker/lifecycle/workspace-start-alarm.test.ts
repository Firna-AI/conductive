import { afterEach, expect, it, vi } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { nativeWorkspaceStorage } from './platform-storage'
import { WorkspaceStartCoordinator } from './start-coordinator'
import { outsideResumeJob } from './start-outside.test-support'
import { START_JOB_KEY } from './start-storage'
import { serializeStartJob } from './start-job-codec'
import { createWorkspaceController } from './workspace-controller'

const fixtureForTest = setupBackendTests()
afterEach(() => vi.restoreAllMocks())

it('limits a lifecycle run to six full advances and leaves the next phase for an alarm', async () => {
  const fixture = fixtureForTest()
  const id = 'bounded-start'
  fixture.runtime.workspace(id)
  const actor = fixture.actors.get(id)
  if (!actor) throw new Error('Missing alarm actor')
  const storage = nativeWorkspaceStorage(actor.storage)
  await storage.put(
    'job',
    START_JOB_KEY,
    serializeStartJob(outsideResumeJob(fixture, id, 'bx_1')),
  )
  const controller = createWorkspaceController(
    fixture.runtime.env,
    fixture.runtime.dependencies,
    {
      storage,
      blockConcurrencyWhile: (operation) => operation(),
      waitUntil: () => {},
      publish: async () => {},
    },
  )
  const phases = [
    'ready',
    'fetch',
    'branch',
    'startup',
    'terminal',
    'terminal-password',
    'runner',
  ] as const
  const advance = vi
    .spyOn(WorkspaceStartCoordinator.prototype, 'advance')
    .mockImplementation(async () => {
      const job = await storage.get('job', START_JOB_KEY)
      const phase = phases[advance.mock.calls.length - 1]
      if (job?.kind !== 'resume' || !phase)
        throw new Error('Missing alarm checkpoint')
      await storage.put('job', START_JOB_KEY, { ...job, phase })
      return false
    })
  await controller.alarm()
  expect(advance).toHaveBeenCalledTimes(6)
  expect(await storage.get('job', START_JOB_KEY)).toMatchObject({
    phase: 'terminal-password',
  })
  expect(await storage.get('number', 'alarm:lifecycle:start')).toBe(
    TEST_TIME + 1_000,
  )
})

it('still advances a due start once when earlier work used the five-second run budget', async () => {
  const fixture = fixtureForTest()
  const id = 'slow-owner-start'
  fixture.runtime.workspace(id)
  const actor = fixture.actors.get(id)
  if (!actor) throw new Error('Missing alarm actor')
  const storage = nativeWorkspaceStorage(actor.storage)
  await storage.put(
    'job',
    START_JOB_KEY,
    serializeStartJob(outsideResumeJob(fixture, id, 'bx_1')),
  )
  const controller = createWorkspaceController(
    fixture.runtime.env,
    fixture.runtime.dependencies,
    {
      storage,
      blockConcurrencyWhile: (operation) => operation(),
      waitUntil: () => {},
      publish: async () => {},
    },
  )
  const pending = WorkspaceStartCoordinator.prototype.pending
  let slowed = false
  vi.spyOn(WorkspaceStartCoordinator.prototype, 'pending').mockImplementation(
    async function (this: WorkspaceStartCoordinator) {
      // An earlier owner of the run, such as a slow publication retry,
      // takes six seconds before the start work begins.
      if (!slowed) {
        slowed = true
        fixture.setTime(TEST_TIME + 6_000)
      }
      return pending.call(this)
    },
  )
  const advance = vi
    .spyOn(WorkspaceStartCoordinator.prototype, 'advance')
    .mockImplementation(async () => {
      const job = await storage.get('job', START_JOB_KEY)
      if (job?.kind !== 'resume') throw new Error('Missing alarm checkpoint')
      await storage.put('job', START_JOB_KEY, { ...job, phase: 'fetch' })
      return false
    })
  await controller.alarm()
  expect(advance).toHaveBeenCalledTimes(1)
  expect(await storage.get('job', START_JOB_KEY)).toMatchObject({
    phase: 'fetch',
  })
})
