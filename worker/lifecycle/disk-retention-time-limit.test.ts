import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { readRetention } from './retention-data'
import { resumeCompletedWorkspace as resumeWorkspace } from './completed-resume-test-support'

const backendFixture = setupBackendTests()
const STARTED_AT = TEST_TIME + 1_123_260_000
const DEADLINE = TEST_TIME + 1_124_460_000
const FAILURE =
  'The cloud computer did not start within the 20-minute limit. Try again.'

async function retentionFixture() {
  const fixture = await backendFixture()
  const created = await fixture.run(() =>
    createCompletedWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const platform = fixture.actors.get(id)
  if (!platform) throw new Error('Missing workspace controller')
  fixture.setTime(TEST_TIME)
  fixture.boat.states.set('bx_1', 'archived')
  await platform.endpoint().lifecycleStopped()
  fixture.setTime(STARTED_AT)
  await platform.endpoint().alarm()
  return {
    ...fixture,
    id,
    platform,
    progress: () => readRetention(fixture.runtime.env.DB, id),
    tick: async (at: number) => {
      fixture.setTime(at)
      await platform.endpoint().alarm()
    },
  }
}

it('ends an unready retention restart at its original deadline through phase changes, reconstruction, and stop retries, then permits user resume', async () => {
  const fixture = await retentionFixture()
  const { boat, platform, runtime, org, user, id } = fixture
  expect(await fixture.progress()).toMatchObject({ phase: 'wait' })
  boat.states.set('bx_1', 'archived')
  await fixture.tick(STARTED_AT + 600_000)
  expect(await fixture.progress()).toMatchObject({ phase: 'resume' })
  await fixture.tick(STARTED_AT + 600_000)
  boat.states.set('bx_1', 'provisioning')
  await fixture.tick(DEADLINE - 1)
  const before = await fixture.progress()
  const alarm = platform.storage.alarmAt
  platform.restart()
  boat.failStop = true
  await fixture.tick(DEADLINE)

  expect(await fixture.progress()).toEqual({ phase: 'stop', error: FAILURE })
  expect(before).toEqual({ phase: 'wait', error: null })
  expect(alarm).toBe(DEADLINE)
  expect(boat.stopIds).toEqual(['bx_1'])
  expect(await platform.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    error: { code: 'workspace_start_failed', message: FAILURE, log: null },
  })
  platform.restart()
  await fixture.tick(DEADLINE + 5_000)
  expect(await fixture.progress()).toEqual({ phase: 'stop', error: FAILURE })
  expect(boat.stopIds).toEqual(['bx_1', 'bx_1'])
  expect(boat.resumeIds).toEqual(['bx_1', 'bx_1'])
  boat.failStop = false
  await fixture.tick(DEADLINE + 10_000)
  expect(await fixture.progress()).toBeNull()
  expect(await platform.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    error: { message: FAILURE },
  })
  await fixture.run(() => resumeWorkspace(runtime, org.id, id, user.id))
  expect(await platform.endpoint().readLifecycle()).toMatchObject({
    state: 'ready',
    startupPrepared: true,
    start: { kind: 'resume' },
    error: null,
    nextDiskKeepaliveAt: null,
  })
  expect(boat.resumeIds).toEqual(['bx_1', 'bx_1', 'bx_1'])
  expect(boat.stopIds).toEqual(['bx_1', 'bx_1', 'bx_1'])
  expect(boat.deletedIds).toEqual([])
})

it('records retention timeout when startup finishes at the original deadline and preserves it after stop cleanup', async () => {
  const fixture = await retentionFixture()
  await fixture.tick(STARTED_AT)
  expect(await fixture.progress()).toEqual({ phase: 'startup', error: null })
  fixture.boat.beforeCommand = async (_command, detached) => {
    if (detached) fixture.setTime(DEADLINE)
  }
  await fixture.tick(DEADLINE - 1)

  expect(await fixture.progress()).toEqual({ phase: 'stop', error: FAILURE })
  fixture.platform.restart()
  await fixture.tick(DEADLINE + 5_000)
  expect(await fixture.progress()).toBeNull()
  expect(await fixture.platform.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    error: { code: 'workspace_start_failed', message: FAILURE, log: null },
  })
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  expect(fixture.boat.resumeIds).toEqual(['bx_1'])
})
